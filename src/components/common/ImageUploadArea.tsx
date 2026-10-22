'use client';

import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, X, Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import { uploadMediaFile, validateImageFile } from '@/lib/storage/uploadMedia';

interface ImageUploadAreaProps {
  bucket?: 'community-media' | 'secure-message-attachments';
  folder?: string;
  conversationId?: string;
  maxFiles?: number;
  images?: string[];
  onChange?: (images: string[]) => void;
  multiple?: boolean;
  currentUrls?: string[];
  onUploadComplete?: (urls: string[]) => void;
  onRemove?: (index?: number) => void;
  label?: string;
  helperText?: string;
  compact?: boolean;
}

export default function ImageUploadArea({
  bucket = 'community-media',
  folder = 'general',
  conversationId,
  maxFiles = 1,
  images = [],
  onChange,
  multiple = false,
  currentUrls = [],
  onUploadComplete,
  onRemove,
  label,
  helperText,
  compact = false,
}: ImageUploadAreaProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeImages = images.length > 0 ? images : currentUrls;
  const effectiveMaxFiles = multiple ? Math.max(maxFiles, 5) : maxFiles;
  const canAddMore = activeImages.length < effectiveMaxFiles;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const availableSlots = effectiveMaxFiles - activeImages.length;
    if (availableSlots <= 0) {
      setErrorMessage(`Maximum limit of ${effectiveMaxFiles} image${effectiveMaxFiles > 1 ? 's' : ''} reached.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);
    setIsUploading(true);

    const uploadedUrls: string[] = [];

    for (const file of filesToUpload) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Invalid file format.');
        setIsUploading(false);
        return;
      }

      const result = await uploadMediaFile(file, {
        bucket,
        folder,
        conversationId,
      });

      if (result.success && result.url) {
        uploadedUrls.push(result.url);
      } else {
        setErrorMessage(result.error || 'Upload failed. Please try again.');
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(false);
    const newImages = [...activeImages, ...uploadedUrls];
    onChange?.(newImages);
    onUploadComplete?.(newImages);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const updated = activeImages.filter((_, idx) => idx !== indexToRemove);
    onChange?.(updated);
    onUploadComplete?.(updated);
    onRemove?.(indexToRemove);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Upload Drop Zone / Button */}
      {canAddMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
            compact ? 'p-3' : 'p-4 sm:p-5'
          } ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40'
              : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={maxFiles > 1}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {isUploading ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-700 dark:text-emerald-400" />
              <span>Uploading photo...</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1">
                <Camera className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Click or drag & drop photo{maxFiles > 1 ? 's' : ''} here
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Supports JPEG, PNG, WebP (Max 10MB{maxFiles > 1 ? `, up to ${maxFiles} photos` : ''})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Image Previews with Bounded Height and Aspect-Ratio Preservation */}
      {activeImages.length > 0 && (
        <div
          className={`grid gap-2.5 pt-1 ${
            activeImages.length === 1
              ? 'grid-cols-1'
              : activeImages.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {activeImages.map((url, idx) => (
            <div
              key={idx}
              className={`relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900/5 dark:bg-slate-950/40 flex items-center justify-center shadow-xs transition-colors ${
                activeImages.length === 1 ? 'max-h-56 h-48 sm:h-56 w-full' : 'max-h-44 h-36 sm:h-40 w-full'
              }`}
            >
              <img
                src={url}
                alt={`Uploaded Attachment ${idx + 1}`}
                className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/75 hover:bg-rose-600 text-white transition-colors cursor-pointer shadow-md focus:outline-hidden"
                title="Remove attachment"
                aria-label="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {helperText && !errorMessage && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
