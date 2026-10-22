'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Mail, 
  KeyRound, 
  User, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [precinct, setPrecinct] = useState('Elmina Green 3');
  const [unitNumber, setUnitNumber] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        setSuccessMessage('Sign in successful! Loading your session...');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1000);
      } else {
        // Sign Up with user metadata
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              display_name: displayName.trim() || fullName.split(' ')[0],
              township_precinct: precinct,
              unit_number: unitNumber.trim(),
              phone: phone.trim(),
              role: 'resident',
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        setSuccessMessage('Resident account registration successful! Please check your email for the confirmation link.');
        setTimeout(() => {
          setMode('signin');
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
              TE
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {mode === 'signin' ? 'Resident Sign In' : 'Elmina Resident Registration'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Supabase Auth • PDPA Compliance Standards
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-3.5 mt-4 text-xs">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name (as per NRIC / Passport)</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nurul Huda binti Ahmad"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Display Name / Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Nurul (EG3)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Residential Precinct</label>
                  <select
                    value={precinct}
                    onChange={(e) => setPrecinct(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="Elmina Green 1">Elmina Green 1</option>
                    <option value="Elmina Green 3">Elmina Green 3</option>
                    <option value="Elmina Green 4">Elmina Green 4</option>
                    <option value="Elmina West">Elmina West</option>
                    <option value="Denai Alam">Denai Alam</option>
                    <option value="Ara Damansara">Ara Damansara</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Number (Confidential)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. No 24, Jalan EG 3/4"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (Confidential)</label>
                <input
                  type="tel"
                  placeholder="e.g. +6012-345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
              🛡️ <strong>Resident Verification Process:</strong> Your account will initially be created as &quot;Unverified&quot;. You can upload proof of ownership or tenancy (S&amp;P / Tenancy Agreement) for verification by Elmina JMB management.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
          >
            {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Register Resident Account'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          {mode === 'signin' ? (
            <p>
              Don&apos;t have a resident account yet?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(null); }}
                className="text-emerald-800 font-bold hover:underline cursor-pointer"
              >
                Register Now
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(null); }}
                className="text-emerald-800 font-bold hover:underline cursor-pointer"
              >
                Sign In Here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
