/**
 * Run the complete migration A → Z
 * Each step is independent — if one fails, fix it and re-run just that step
 *
 * Usage:
 *   node scripts/migration/run-all.mjs          # run everything
 *   node scripts/migration/run-all.mjs --from 5 # start from step 5
 *   node scripts/migration/run-all.mjs --only 1 # run only step 1
 */
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const fromStep = (() => { const i = args.indexOf('--from'); return i !== -1 ? parseInt(args[i + 1]) : 1; })();
const onlyStep = (() => { const i = args.indexOf('--only'); return i !== -1 ? parseInt(args[i + 1]) : null; })();

const STEPS = [
  { n: 1,  name: 'Sectors',              file: 'm01-sectors.mjs' },
  { n: 2,  name: 'Countries',            file: 'm02-countries.mjs' },
  { n: 3,  name: 'Sections',             file: 'm03-sections.mjs' },
  { n: 4,  name: 'Authors',              file: 'm04-authors.mjs' },
  { n: 5,  name: 'Drupal Articles',      file: 'm05-articles-drupal.mjs' },
  { n: 6,  name: 'awalan Articles',      file: 'm06-articles-awalan.mjs' },
  { n: 7,  name: 'Magazines',            file: 'm07-magazines.mjs' },
  { n: 8,  name: 'Newsletter',           file: 'm08-newsletter.mjs' },
  { n: 9,  name: 'Profiles (awalan)',    file: 'm09-profiles.mjs' },
  { n: 10, name: 'Images (Drupal)',       file: 'm10-images-drupal.mjs' },
  { n: 11, name: 'Images (awalan)',       file: 'm11-images-awalan.mjs' },
  { n: 12, name: 'Verify',               file: 'm12-verify.mjs' },
];

const toRun = onlyStep
  ? STEPS.filter(s => s.n === onlyStep)
  : STEPS.filter(s => s.n >= fromStep);

console.log('━'.repeat(60));
console.log('  MIGRATION PIPELINE');
console.log('━'.repeat(60));
toRun.forEach(s => console.log(`  ${s.n.toString().padStart(2, '0')}. ${s.name}`));
console.log('━'.repeat(60) + '\n');

for (const step of toRun) {
  const start = Date.now();
  console.log(`\n${'▶'.repeat(3)} Step ${step.n}: ${step.name}`);
  try {
    execSync(`node ${resolve(__dirname, step.file)}`, {
      stdio: 'inherit',
      env: { ...process.env },
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`${'✅'.repeat(1)} Step ${step.n} done in ${elapsed}s`);
  } catch (e) {
    console.error(`\n❌ Step ${step.n} (${step.name}) failed!`);
    console.error('Fix the issue and re-run with: node run-all.mjs --from ' + step.n);
    process.exit(1);
  }
}

console.log('\n' + '═'.repeat(60));
console.log('  ✅  MIGRATION COMPLETE');
console.log('═'.repeat(60));
