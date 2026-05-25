#!/usr/bin/env python3
"""
One-off: re-host article featured images from the (broken on-site) api.awalan.com
source into Supabase Storage, then repoint articles.featured_image.

The source files are alive at api.awalan.com but break in the app because their
paths contain '~' and Arabic characters. Copying them to the articles bucket
(clean ASCII keys) makes them load like every other Supabase-hosted image.

Idempotent: only touches rows whose featured_image still points at api.awalan.com,
so re-running resumes where it left off. Only updates the DB after a successful
upload; download/upload failures are logged and the original URL is left intact.
"""
import json, os, sys, time, threading, subprocess, urllib.request, urllib.parse, mimetypes
from concurrent.futures import ThreadPoolExecutor

# This sandbox's DNS/TLS to api.awalan.com is unreliable from Python (intermittent
# resolution, hanging connections), but curl with a pinned IP is rock-solid. So we
# download via curl --resolve. Supabase requests use urllib (resolves fine).
AWALAN_IP = "13.39.90.14"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def env():
    d = {}
    for line in open(os.path.join(ROOT, ".env.local")):
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip().strip('"\'')
    return d

E = env()
U = E["NEXT_PUBLIC_SUPABASE_URL"]
K = E["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": K, "Authorization": f"Bearer {K}"}
BUCKET = "articles"
PREFIX = "awalan"

def enc_url(u):
    pr = urllib.parse.urlsplit(u)
    return urllib.parse.urlunsplit((pr.scheme, pr.netloc, urllib.parse.quote(pr.path), pr.query, ""))

# The sandbox's TLS to Supabase is intermittently slow (handshake timeouts), so
# every urllib call retries with backoff instead of crashing the run.
def urlopen_retry(req, timeout, attempts=6):
    last = None
    for i in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as x:
                return x.status, x.read()
        except Exception as e:
            last = e
            time.sleep(0.7 * (i + 1))
    raise last

def fetch_batch(offset, limit=500):
    q = (f"{U}/rest/v1/articles?select=id,featured_image"
         f"&featured_image=like.{urllib.parse.quote('%api.awalan.com%')}"
         f"&order=id&limit={limit}&offset={offset}")
    _, body = urlopen_retry(urllib.request.Request(q, headers=H), 30)
    return json.loads(body)

def _ct_from_magic(data):
    if data[:8].startswith(b"\x89PNG"): return "image/png"
    if data[:4] == b"GIF8": return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP": return "image/webp"
    return "image/jpeg"

def download(url):
    last = None
    for attempt in range(3):
        try:
            p = subprocess.run(
                ["curl", "-sS", "--resolve", f"api.awalan.com:443:{AWALAN_IP}",
                 "--max-time", "30", "-A", "Mozilla/5.0", "-o", "-", enc_url(url)],
                capture_output=True, timeout=40)
            if p.returncode != 0 or not p.stdout:
                raise RuntimeError(f"curl rc={p.returncode} {p.stderr[:60]!r}")
            return p.stdout, _ct_from_magic(p.stdout)
        except Exception as e:
            last = e
            time.sleep(0.5 * (attempt + 1))
    raise last

def ext_for(url, content_type):
    path = urllib.parse.urlsplit(url).path.lower()
    for e in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if path.endswith(e):
            return ".jpg" if e == ".jpeg" else e
    return mimetypes.guess_extension(content_type) or ".jpg"

def upload(key, data, content_type):
    req = urllib.request.Request(
        f"{U}/storage/v1/object/{BUCKET}/{key}", data=data, method="POST",
        headers={**H, "Content-Type": content_type or "image/jpeg", "x-upsert": "true"})
    return urlopen_retry(req, 60)[0]

def repoint(article_id, public_url):
    body = json.dumps({"featured_image": public_url}).encode()
    req = urllib.request.Request(
        f"{U}/rest/v1/articles?id=eq.{article_id}", data=body, method="PATCH",
        headers={**H, "Content-Type": "application/json", "Prefer": "return=minimal"})
    return urlopen_retry(req, 30)[0]

def main():
    # Snapshot the full work list upfront so failures (left as-is) don't cause an
    # infinite re-fetch loop. Re-running the script retries any leftover failures.
    rows, offset = [], 0
    while True:
        batch = fetch_batch(offset)
        if not batch:
            break
        rows.extend(batch)
        offset += len(batch)
    print(f"to migrate: {len(rows)}", flush=True)

    counters = {"migrated": 0, "failed": 0}
    fail_log = []
    lock = threading.Lock()

    def work(a):
        aid, src = a["id"], a["featured_image"]
        try:
            data, ct = download(src)
            if not data or not (ct.startswith("image") or len(data) > 1000):
                raise ValueError(f"not an image (ct={ct}, bytes={len(data)})")
            key = f"{PREFIX}/{aid}{ext_for(src, ct)}"
            upload(key, data, ct if ct.startswith("image") else "image/jpeg")
            repoint(aid, f"{U}/storage/v1/object/public/{BUCKET}/{key}")
            with lock:
                counters["migrated"] += 1
                if counters["migrated"] % 50 == 0:
                    print(f"  migrated={counters['migrated']} failed={counters['failed']}", flush=True)
        except Exception as ex:
            with lock:
                counters["failed"] += 1
                fail_log.append((aid, src, str(ex)[:80]))  # left intact; retry on re-run

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(work, rows))

    print(f"\nDONE. migrated={counters['migrated']} failed={counters['failed']}", flush=True)
    if fail_log:
        print("failures (first 40):", flush=True)
        for aid, src, err in fail_log[:40]:
            print(f"  {aid} | {err} | {src[:80]}", flush=True)

if __name__ == "__main__":
    main()
