/**
 * PDF → WebP page images conversion pipeline.
 *
 * Runs entirely in the admin's browser:
 *   1. Load PDF via pdfjs-dist
 *   2. Render each page to canvas at 1.5× scale
 *   3. Export as WebP blob (quality 0.88)
 *   4. Upload to Supabase Storage: magazines/pages/{issueId}/page-NNN.webp (upsert)
 *   5. Return ordered array of public CDN URLs
 *
 * The original PDF is NOT handled here — upload it separately via uploadFile().
 */

import { createClient } from '@/lib/supabase/client';

const SCALE = 1.5;
const WEBP_QUALITY = 0.88;
const BUCKET = 'magazines';

let pdfWorkerConfigured = false;

async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfWorkerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    pdfWorkerConfigured = true;
  }
  return pdfjs;
}

async function renderPageToBlob(pdf: any, pageNum: number): Promise<Blob> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: SCALE });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
      'image/webp',
      WEBP_QUALITY
    );
  });
}

/**
 * Convert a PDF (File object or public URL) to an array of WebP page images
 * stored in Supabase Storage under magazines/pages/{issueId}/.
 *
 * @param source    - Local File selected by admin, or existing public PDF URL
 * @param issueId   - Magazine issue UUID (used as the storage folder name)
 * @param onProgress - Called after each page upload: (completedPages, totalPages)
 * @returns Ordered array of public CDN URLs for each page
 */
export async function convertPdfToImages(
  source: File | string,
  issueId: string,
  onProgress: (current: number, total: number) => void
): Promise<string[]> {
  const pdfjs = await getPdfJs();
  const supabase = createClient();

  // Load PDF bytes
  let pdfData: ArrayBuffer;
  if (typeof source === 'string') {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`فشل تحميل ملف PDF: ${res.status}`);
    pdfData = await res.arrayBuffer();
  } else {
    pdfData = await source.arrayBuffer();
  }

  const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
  const numPages = pdf.numPages;
  const urls: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const blob = await renderPageToBlob(pdf, pageNum);
    const paddedNum = String(pageNum).padStart(3, '0');
    const storagePath = `pages/${issueId}/page-${paddedNum}.webp`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, blob, { contentType: 'image/webp', upsert: true });

    if (error) {
      throw new Error(`فشل رفع صفحة ${pageNum}: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    urls.push(urlData.publicUrl);

    onProgress(pageNum, numPages);
  }

  return urls;
}
