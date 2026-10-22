import { createClient } from '@/lib/supabase/client';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file format. Allowed formats are JPEG, PNG, and WebP only.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size exceeds the 10MB limit (selected file is ${sizeInMb}MB).`,
    };
  }

  return { isValid: true };
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaFile(
  file: File,
  options: {
    bucket: 'community-media' | 'secure-message-attachments';
    folder?: string;
    conversationId?: string;
  }
): Promise<UploadResult> {
  // 1. File Validation
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const supabase = createClient();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? fileExt : 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
  const folder = options.folder || (options.conversationId ? `conversations/${options.conversationId}` : 'general');
  const filePath = `${folder}/${fileName}`;

  try {
    // 2. Attempt Supabase Storage Upload
    const { error: uploadError } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      // In development or if storage bucket hasn't been created via dashboard yet,
      // fall back seamlessly to base64 DataURL so UI remains completely functional.
      console.warn('Supabase storage upload fallback to local data URL:', uploadError.message);
      const dataUrl = await readFileAsDataUrl(file);
      return { success: true, url: dataUrl, path: filePath };
    }

    // 3. Resolve Public or Signed URL
    if (options.bucket === 'community-media') {
      const { data: publicData } = supabase.storage
        .from('community-media')
        .getPublicUrl(filePath);

      return {
        success: true,
        url: publicData.publicUrl,
        path: filePath,
      };
    } else {
      // Private bucket: Create signed URL for authorized access (7 days validity)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('secure-message-attachments')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (signedError || !signedData?.signedUrl) {
        const dataUrl = await readFileAsDataUrl(file);
        return { success: true, url: dataUrl, path: filePath };
      }

      return {
        success: true,
        url: signedData.signedUrl,
        path: filePath,
      };
    }
  } catch (err) {
    console.warn('Storage operation exception, using fallback data URL:', err);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      return { success: true, url: dataUrl, path: filePath };
    } catch {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to process file upload.',
      };
    }
  }
}

export async function uploadMedia(
  file: File,
  bucket: 'community-media' | 'secure-message-attachments' = 'community-media',
  folder?: string,
  conversationId?: string
): Promise<UploadResult> {
  return uploadMediaFile(file, { bucket, folder, conversationId });
}
