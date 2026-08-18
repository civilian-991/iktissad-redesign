/**
 * Canonical slug generation.
 *
 * Rules, and why each exists:
 *  - Built from the CLEAN title. 2,660 live slugs are shattered
 *    (`ع-يد-ب-أ-ي-ة-ح-ال-…`) because they were generated from a title that had
 *    already been corrupted in transit. Slugs are only as good as the title.
 *  - `<br>` and other markup are stripped as TAGS first. Drupal aliases contain
 *    a literal `-br-` because the tag was slugified instead of removed, which is
 *    why 79% of legacy redirects currently 404.
 *  - Arabic tashkeel is removed; letters are never transliterated or normalised
 *    (normalising alef would change the word, not just the spelling).
 *  - Collisions resolve to `<slug>-<sourceId>`, which is stable and meaningful.
 *    The old pipeline appended a random 6-char hash, so re-running produced
 *    different URLs and the clean slug stayed squatted by a duplicate.
 */

const TASHKEEL = /[ً-ْٰـ]/g;

/**
 * Strip markup properly — as tags, not as text.
 *
 * 7,563 of 9,225 Drupal titles (82%) carry markup: 8,877 `<br>` plus typos —
 * `<pr>`, `<brb>`, `<<br>`, `<r>`, `<null>`.
 *
 * A naive /<[^>]+>/ is unsafe here. One real title reads
 *   "…<br? لإدارة وتشغيل محطات الركاب <br>"
 * where `<br?` never closes, so the greedy match would run to the NEXT `>` and
 * swallow the Arabic in between. So: only sequences that actually look like a
 * tag are removed, and any leftover stray angle bracket is dropped on its own
 * without taking neighbouring text with it.
 */
export function stripMarkup(s) {
  return (s || '')
    // HTML comments FIRST, contents included. Word-pasted articles carry
    // conditional blocks like <!--[if gte mso 9]><xml>…</xml><![endif]-->; the
    // tag rules below would strip the angle brackets and leave the XML junk as
    // prose, which then surfaced as meta descriptions reading
    // "!--[if gte mso 9] :OfficeDocumentSettings :RelyOnVML…".
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<!--[\s\S]*$/g, ' ')          // unclosed comment: drop the remainder
    .replace(/<!\[if[\s\S]*?\]>/gi, ' ')
    .replace(/<!\[endif\]>/gi, ' ')
    // namespaced Office/XML tags: <o:p>, <w:WordDocument>, <st1:place>
    .replace(/<\/?[a-zA-Z][\w-]*:[\w-]+(?:\s[^<>]*)?\/?>/g, ' ')
    // real tags: <name ...> or </name>, name must start with a letter
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^<>]*)?\/?>/g, ' ')
    // a broken opening tag: "<br?" — remove the bracket AND the tag-name remnant,
    // but stop at the first space so the following text is untouched
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*[?!]?/g, ' ')
    // "<" is never legitimate in a headline; drop it
    .replace(/</g, ' ')
    // ">" IS legitimate as "greater than" when it stands alone between spaces;
    // only remove it when it is closing a broken tag (glued to preceding text)
    .replace(/(\S)>/g, '$1 ')
    .replace(/^>\s*/, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&lt;|&gt;/gi, ' ')
    // zero-width and bidi control characters: invisible, but they leave text
    // "starting with punctuation" and break leading-character checks
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    // a stray leading diacritic or joiner is a fragment of a stripped word
    .replace(/^[ً-ْٰـ]+/, '')
    .trim();
}

export function makeSlug(title, { maxLength = 90 } = {}) {
  let s = stripMarkup(title)
    .replace(TASHKEEL, '')
    // Quotation marks are DELETED, not turned into separators.
    //
    // Arabic proclitics attach directly to the following word: و«ماجد» ("and
    // Majid"), ل"إنجي" ("for Engie"). Replacing the quote with a space strands
    // the particle as its own one-letter URL segment — و-ماجد, ل-إنجي — which
    // accounted for 2,260 slugs. Deleting the quote yields وماجد, لإنجي.
    .replace(/[«»""''`"'’‘“”]/g, '')
    // sentence punctuation IS a word boundary, so it becomes a separator
    .replace(/[:؛;,،.!؟?()\[\]{}\/\\|@#$%^&*+=~<>]/g, ' ')
    .replace(/[–—_]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // keep Arabic letters, Arabic-Indic + Latin digits, Latin letters, hyphen
  s = s.replace(/[^؀-ۿݐ-ݿa-zA-Z0-9-]/g, '');
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');

  if (s.length > maxLength) {
    const cut = s.slice(0, maxLength);
    const lastHyphen = cut.lastIndexOf('-');
    s = (lastHyphen > maxLength * 0.6 ? cut.slice(0, lastHyphen) : cut).replace(/-$/, '');
  }
  return s.toLowerCase();
}

/**
 * Assign unique slugs across a set of stories.
 * Deterministic: same input always yields the same slugs, so re-running the
 * migration never changes a URL.
 */
export function assignSlugs(stories, { idOf }) {
  const taken = new Map(); // slug -> story
  const collisions = [];
  // stable order so results do not depend on input ordering
  const ordered = [...stories].sort((a, b) => (idOf(a) < idOf(b) ? -1 : idOf(a) > idOf(b) ? 1 : 0));

  for (const st of ordered) {
    let base = makeSlug(st.title);
    if (!base) base = `article-${idOf(st)}`;
    let slug = base;
    if (taken.has(slug)) {
      slug = `${base}-${idOf(st)}`;
      collisions.push({ base, resolved: slug, title: st.title });
      // pathological case: same base AND same id — cannot happen, but stay safe
      let n = 2;
      while (taken.has(slug)) slug = `${base}-${idOf(st)}-${n++}`;
    }
    taken.set(slug, st);
    st.slug = slug;
  }
  return { collisions, total: taken.size };
}

/** The trailing segment of a Drupal alias, used to match legacy URLs. */
export function aliasTail(alias) {
  const parts = String(alias || '').split('/');
  return parts[parts.length - 1] || '';
}
