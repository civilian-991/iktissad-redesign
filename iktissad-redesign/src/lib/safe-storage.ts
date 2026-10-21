/**
 * localStorage / sessionStorage that never throws.
 *
 * Merely touching `window.localStorage` throws a SecurityError when the
 * browser blocks site storage (Android "block cookies", some in-app browsers,
 * sandboxed frames) — even `typeof localStorage` does. Reads return null and
 * writes are dropped in that case, so features degrade instead of crashing.
 */

type StorageKind = 'local' | 'session';

function store(kind: StorageKind): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function storageGet(key: string, kind: StorageKind = 'local'): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string, kind: StorageKind = 'local'): void {
  try {
    store(kind)?.setItem(key, value);
  } catch {
    // Storage blocked or full — the feature just won't remember this.
  }
}
