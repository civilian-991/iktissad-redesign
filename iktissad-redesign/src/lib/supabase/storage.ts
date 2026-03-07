/**
 * Supabase Storage Utilities
 *
 * Functions for uploading, deleting, listing, and getting public URLs
 * for files stored in Supabase Storage buckets.
 *
 * Buckets: 'articles', 'magazines', 'media', 'avatars'
 */

import { createClient } from './client';

export type StorageBucket = 'articles' | 'magazines' | 'media' | 'avatars';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export interface StorageFile {
  name: string;
  id: string | null;
  size: number;
  type: string;
  createdAt: string;
  updatedAt: string;
  publicUrl: string;
  path: string;
}

/**
 * Upload a file to a Supabase Storage bucket.
 */
export async function uploadFile(
  bucket: StorageBucket,
  file: File,
  folder?: string
): Promise<UploadResult> {
  const supabase = createClient();

  // Build a unique file path: folder/timestamp-originalname
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = folder
    ? `${folder}/${timestamp}-${safeName}`
    : `${timestamp}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const publicUrl = getPublicUrl(bucket, data.path);

  return {
    path: data.path,
    publicUrl,
  };
}

/**
 * Delete a file from a Supabase Storage bucket.
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Get the public URL for a file in a Supabase Storage bucket.
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const supabase = createClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

/**
 * List files in a folder within a Supabase Storage bucket.
 */
export async function listFiles(
  bucket: StorageBucket,
  folder?: string
): Promise<StorageFile[]> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder ?? '', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return (data ?? [])
    .filter((item) => item.name !== '.emptyFolderPlaceholder')
    .map((item) => {
      const filePath = folder ? `${folder}/${item.name}` : item.name;
      return {
        name: item.name,
        id: item.id ?? null,
        size: item.metadata?.size ?? 0,
        type: item.metadata?.mimetype ?? 'application/octet-stream',
        createdAt: item.created_at ?? '',
        updatedAt: item.updated_at ?? '',
        publicUrl: getPublicUrl(bucket, filePath),
        path: filePath,
      };
    });
}

/**
 * Validate a file before uploading.
 * Returns null if valid, error message string if invalid.
 */
export function validateFile(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): string | null {
  const { maxSizeMB = 10, allowedTypes } = options;

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File size exceeds ${maxSizeMB}MB limit`;
  }

  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some((type) => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });
    if (!isAllowed) {
      return `File type ${file.type} is not allowed`;
    }
  }

  return null;
}
