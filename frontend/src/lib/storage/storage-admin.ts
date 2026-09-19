/**
 * Storage Admin Operations — Supabase bucket management.
 *
 * ⚠️  INTERNAL / INFRASTRUCTURE ONLY
 *
 * These operations require Supabase service-role privileges.
 * In production they MUST be called from the backend (Go), never from
 * browser or Next.js UI code. This file exists for development seeding
 * scripts and server-side admin tooling only.
 *
 * UI code (src/app, src/components, src/features) must NEVER import from
 * this file — an ESLint boundary enforces this rule.
 */

import { createClient } from '@/utils/supabase/client';
import type { CreateBucketOptions, BucketInfo } from './types';

function getSupabaseAdminClient() {
  return createClient();
}

export async function createBucket(options: CreateBucketOptions): Promise<BucketInfo> {
  const supabase = getSupabaseAdminClient();
  const { name, public: isPublic = false, fileSizeLimit, allowedMimeTypes } = options;

  const { data, error } = await supabase.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit,
    allowedMimeTypes,
  });

  if (error) throw new Error(`Failed to create bucket: ${error.message}`);
  return data as BucketInfo;
}

export async function getBucket(name: string): Promise<BucketInfo | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.getBucket(name);

  if (error) {
    if (error.message.includes('not found')) return null;
    throw new Error(`Failed to get bucket: ${error.message}`);
  }
  return data as BucketInfo;
}

export async function listBuckets(): Promise<BucketInfo[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.listBuckets();

  if (error) throw new Error(`Failed to list buckets: ${error.message}`);
  return data as BucketInfo[];
}

export async function updateBucket(
  name: string,
  options: Partial<CreateBucketOptions>,
): Promise<BucketInfo> {
  const supabase = getSupabaseAdminClient();

  const updatePayload: Partial<Pick<CreateBucketOptions, 'public' | 'fileSizeLimit' | 'allowedMimeTypes'>> = {};
  if (options.public !== undefined) updatePayload.public = options.public;
  if (options.fileSizeLimit !== undefined) updatePayload.fileSizeLimit = options.fileSizeLimit;
  if (options.allowedMimeTypes !== undefined) updatePayload.allowedMimeTypes = options.allowedMimeTypes;

  const { data, error } = await supabase.storage.updateBucket(
    name,
    updatePayload as Parameters<typeof supabase.storage.updateBucket>[1],
  );

  if (error) throw new Error(`Failed to update bucket: ${error.message}`);
  if (!data) throw new Error('Failed to update bucket: No data returned');
  return data as unknown as BucketInfo;
}

export async function deleteBucket(name: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.deleteBucket(name);
  if (error) throw new Error(`Failed to delete bucket: ${error.message}`);
}

export async function emptyBucket(name: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.emptyBucket(name);
  if (error) throw new Error(`Failed to empty bucket: ${error.message}`);
}
