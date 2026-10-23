'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  User, 
  Lock, 
  Phone, 
  Home, 
  ShieldCheck, 
  Upload, 
  X, 
  Check, 
  AlertCircle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function ProfileModal() {
  const { 
    currentUser, 
    updateProfile, 
    isProfileModalOpen, 
    setIsProfileModalOpen,
    t 
  } = useApp();

  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state whenever modal opens or active user switches
  useEffect(() => {
    if (isProfileModalOpen) {
      setDisplayName(currentUser.displayName || '');
      setPhone(currentUser.phone || '');
      setAvatarPreview(currentUser.avatarUrl || '');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isProfileModalOpen, currentUser]);

  if (!isProfileModalOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Invalid file format. Please upload a JPG, PNG or WebP image file.');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setErrorMessage('File size too large. Maximum profile picture size is 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const result = await updateProfile({
        displayName,
        phone,
        avatarUrl: avatarPreview,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to update profile.');
      } else {
        setSuccessMessage('Your profile has been updated successfully!');
        setTimeout(() => {
          setIsProfileModalOpen(false);
          setSuccessMessage(null);
        }, 1200);
      }
    } catch {
      setErrorMessage('An error occurred while updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-extrabold text-slate-900">
              Edit Resident Profile
            </h3>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 text-rose-900 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 text-emerald-900 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Avatar Edit Section */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <img
              src={avatarPreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser.fullName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-600/30 shrink-0"
            />
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Change Profile Picture
              </label>
              <label className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Choose File (Max 2MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-slate-400 mt-1">Formats: JPG, PNG, WebP only.</p>
            </div>
          </div>

          {/* READ-ONLY / LOCKED FIELDS (Strict resident protection) */}
          <div className="space-y-2 bg-slate-100/70 p-3 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Official Records (Read-Only)</span>
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-[10px]" title="Registered Nadikomuniti account">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>VERIFIED</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block">Full Registered Name:</span>
              <span className="font-bold text-slate-800">{currentUser.fullName}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block">Registered Unit Address:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.unitNumber || 'Not Specified'} ({currentUser.townshipPrecinct})
              </span>
            </div>

            <p className="text-[10px] text-slate-400 italic pt-1">
              *Only JMB / township management is authorized to modify registered names, property addresses, or resident roles.
            </p>
          </div>

          {/* EDITABLE FIELDS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Display Name / Community Nickname
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Amir (EG 3)"
              className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-600 bg-white"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              This name will be displayed in community forums and neighbor chat discussions.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Phone Number (Emergency)
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+6012-345 6789"
                className="w-full text-xs border border-slate-200 rounded-xl pl-8 p-2.5 focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>
            <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Privacy Protected: Your phone number will never be visible to other neighbors.</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
