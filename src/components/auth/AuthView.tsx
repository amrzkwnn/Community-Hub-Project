'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ExternalLink,
  RefreshCw,
  Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AuthView() {
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    tryDemo 
  } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'verify' | 'forgot'>('signin');
  
  // Sign In & Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up fields
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(58);

  const supabase = createClient();

  // Read URL query parameters on initial mount (e.g. from email verification callback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError === 'expired_verification_link') {
      setErrorMessage('Your email verification link has expired or is invalid. Please sign in or request a new link.');
    }
    const verified = params.get('verified');
    if (verified === 'true') {
      setSuccessMessage('Your email has been successfully verified! You can now log in.');
    }
  }, []);

  // Handle Sign In submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    const result = await signInWithEmail(cleanEmail, password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid email or password. Please try again.');
    }
  };

  // Handle Sign Up submission (Direct registration without email verification)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('Please accept the Township Terms of Civic Conduct and Privacy Guidelines to proceed.');
      return;
    }

    setIsLoading(true);
    const result = await signUpWithEmail({
      email: cleanEmail,
      password,
    });
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to create account. Please try again.');
      return;
    }

    // Direct entry into Nadikomuniti without email verification
    setSuccessMessage('Account created successfully! Entering Nadikomuniti...');
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to receive password reset instructions.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      });
      setIsLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage(`If an account exists for ${cleanEmail}, you will receive password reset instructions shortly.`);
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Failed to send reset instructions. Please try again.');
    }
  };

  // Handle Resend Verification Email (kept for manual verification access)
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !unconfirmedEmail) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unconfirmedEmail,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage(`A new verification link was sent to ${unconfirmedEmail}.`);
        setResendCooldown(60);
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setErrorMessage('Unable to resend verification email.');
    }
  };

  // Handle Try Demo bypass
  const handleTryDemo = () => {
    setIsDemoLoading(true);
    setTimeout(() => {
      tryDemo();
      setIsDemoLoading(false);
    }, 350);
  };

  // Helper for masked email
  const getMaskedEmail = (raw: string) => {
    if (!raw) return 'a***ria@elmina.resident.my';
    const [user, domain] = raw.split('@');
    if (!domain) return raw;
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
    return `${maskedUser}@${domain}`;
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center py-6 px-4 sm:px-6 md:px-8 overflow-y-auto font-sans antialiased">
      {/* ========================================================================= */}
      {/* IMMERSIVE TOWNSHIP BACKDROP (Approved Stitch Visual Asset)                */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <img 
          alt="Aerial view of masterplanned suburban township" 
          className="w-full h-full object-cover scale-105 filter blur-xs contrast-105 brightness-[0.68]" 
          src="/images/elmina-township-bg.png"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/50" />
      </div>

      {/* ========================================================================= */}
      {/* 1. SIGN IN SCREEN (Exact Google Stitch Design: 546bfa78d3ee4ed9bbd31162a9cbc606) */}
      {/* ========================================================================= */}
      {mode === 'signin' && (
        <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-xl flex flex-col md:flex-row min-h-[580px] my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Left Column (45%) */}
          <div className="relative w-full md:w-[45%] flex flex-col justify-between p-7 sm:p-8 md:p-10 text-white overflow-hidden">
            <div className="absolute inset-0 -z-10">
              <img 
                alt="Neighborhood aerial backdrop" 
                className="w-full h-full object-cover filter brightness-[0.75]" 
                src="/images/elmina-township-bg.png" 
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#9E1315]/90 via-[#9b4500]/75 to-slate-950/90 mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#9E1315]/50 via-transparent to-amber-500/20" />
            </div>

            {/* Official Logo Box */}
            <div className="relative z-10 flex flex-col items-start space-y-2">
              <div className="bg-white/95 rounded-xl p-3 shadow-md backdrop-blur-sm max-w-[240px] w-full flex items-center justify-center">
                <img 
                  src="/images/nadikomuniti-logo-transparent.png" 
                  alt="Nadikomuniti Connect & Relax" 
                  className="max-w-[240px] w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* Headline and Value Proposition */}
            <div className="relative z-10 my-auto py-8">
              <h2 className="text-2xl sm:text-3xl text-white font-bold tracking-tight drop-shadow-sm leading-snug">
                Your Community,<br />Connected.
              </h2>
              <p className="text-slate-100/90 mt-3 max-w-xs leading-relaxed font-normal text-xs sm:text-sm">
                A modern, verified neighborhood portal for safety, circular exchange, and shared living.
              </p>
            </div>

            {/* Subtle Footer */}
            <div className="relative z-10 pt-4 flex items-center justify-between text-[11px] text-white/70">
              <span>Township Civic Network</span>
              <span>Elmina West • EV1</span>
            </div>
          </div>

          {/* Right Column (55%) */}
          <div className="w-full md:w-[55%] p-7 sm:p-8 md:p-12 bg-white dark:bg-[#15181C] flex flex-col justify-center">
            <div className="mb-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Welcome Back
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-1">
                Sign in to Nadikomuniti
              </p>
            </div>

            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4 sm:space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="signin-email">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@elmina.resident.my"
                    autoComplete="email"
                    required
                    className="w-full h-11 sm:h-12 rounded-xl bg-slate-50 dark:bg-slate-900/50 pl-11 pr-4 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/30 focus:border-[#9E1315]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="signin-password">
                    Password
                  </label>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full h-11 sm:h-12 rounded-xl bg-slate-50 dark:bg-slate-900/50 pl-11 pr-11 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/30 focus:border-[#9E1315]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-lg flex items-center justify-center cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#9E1315] accent-[#9E1315] focus:ring-[#9E1315]"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Remember Me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('forgot');
                  }}
                  className="text-xs font-medium text-[#9E1315] dark:text-rose-400 hover:underline transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 sm:h-12 mt-2 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-[#9E1315] via-[#BA1B1D] to-[#D97706] shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Instant Preview Demo Option */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <span className="relative px-3 bg-white dark:bg-[#15181C] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                or preview without login
              </span>
            </div>

            <button
              type="button"
              onClick={handleTryDemo}
              disabled={isDemoLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
            >
              {isDemoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#9E1315]" />
                  <span>Launching Demo Mode...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>Try Demo Mode (Instant Preview)</span>
                </>
              )}
            </button>

            {/* Switch to Sign Up */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('signup');
                  }}
                  className="font-semibold text-[#9E1315] dark:text-rose-400 hover:underline transition-colors ml-1 cursor-pointer"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REGISTER SCREEN (Exact Google Stitch Design: 16bd15888b304d96a2b2f82c127e6d2c) */}
      {/* ========================================================================= */}
      {mode === 'signup' && (
        <div className="w-full max-w-4xl mx-auto rounded-3xl shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-[#15181C]/95 overflow-hidden flex flex-col md:flex-row min-h-[660px] relative my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Left Column (42%) */}
          <div className="relative w-full md:w-[42%] p-7 sm:p-8 md:p-10 flex flex-col justify-between text-white overflow-hidden">
            <img 
              alt="Township neighborhood community" 
              className="absolute inset-0 w-full h-full object-cover scale-110 filter brightness-[0.7] saturate-[1.15]" 
              src="/images/elmina-township-bg.png" 
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#9E1315]/95 via-[#770007]/85 to-[#fd8a42]/80 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-[#9E1315]/30 to-transparent" />

            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              {/* Logo */}
              <div className="flex flex-col gap-3">
                <div className="bg-white/95 rounded-xl p-3 shadow-md backdrop-blur-sm max-w-[240px] w-full flex items-center justify-center">
                  <img 
                    src="/images/nadikomuniti-logo-transparent.png" 
                    alt="Nadikomuniti - Connect & Relax" 
                    className="max-w-[240px] w-full h-auto object-contain"
                  />
                </div>
              </div>

              {/* Slogan & Value Points */}
              <div className="flex flex-col gap-4 my-auto py-6">
                <h2 className="text-2xl sm:text-3xl text-white font-bold tracking-tight">
                  Join Your Community.
                </h2>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
                  Exclusive verification gateway for authenticated homeowners and accredited occupants.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between text-[11px] text-white/70">
                <span>Direct Resident Enrollment</span>
                <span>Immediate Access</span>
              </div>
            </div>
          </div>

          {/* Right Column (58%) */}
          <div className="w-full md:w-[58%] p-7 sm:p-8 md:p-12 bg-white/95 dark:bg-[#15181C] flex flex-col justify-center">
            {/* Form Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Join Your Community
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#9E1315] dark:text-rose-400 text-[11px] font-semibold tracking-wide uppercase">
                  Registration
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
                Create your official Nadikomuniti resident account
              </p>
            </div>

            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
              </div>
            )}

            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
              {/* Field 1: Email Address */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="signup-email">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@elmina.resident.my"
                    autoComplete="email"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/30 focus:border-[#9E1315] transition-all"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="signup-password">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    required
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/30 focus:border-[#9E1315] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 3: Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="signup-confirm-password">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    required
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/30 focus:border-[#9E1315] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terms & Privacy Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                  <input
                    id="signup-terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#9E1315] accent-[#9E1315] focus:ring-0 cursor-pointer shrink-0"
                    required
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                    I agree to the <span className="text-[#9E1315] dark:text-rose-400 font-medium hover:underline">Township Terms of Civic Conduct</span> and <span className="text-[#9E1315] dark:text-rose-400 font-medium hover:underline">Privacy Guidelines</span>.
                  </span>
                </label>
              </div>

              {/* Primary CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#9E1315] via-[#BA1B1D] to-[#fd8a42] shadow-lg shadow-[#9E1315]/25 hover:shadow-xl hover:shadow-[#9E1315]/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer & Alternate Sign In */}
            <div className="mt-8 pt-4 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('signin');
                  }}
                  className="text-[#9E1315] dark:text-rose-400 font-semibold hover:underline transition-colors ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                >
                  Sign In
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VERIFY SCREEN (Exact Google Stitch Design: d8626ab78be24aa184c6b4a8b2028492) */}
      {/* ========================================================================= */}
      {mode === 'verify' && (
        <div className="relative z-10 w-full max-w-lg mx-auto bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-7 sm:p-8 md:p-10 text-center transition-all duration-300 my-auto animate-in fade-in zoom-in-95">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <img 
              src="/images/nadikomuniti-logo-transparent.png" 
              alt="Nadikomuniti Logo" 
              className="max-w-[180px] w-auto h-auto mx-auto object-contain mb-2"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl text-slate-900 dark:text-white mb-2 font-bold tracking-tight">
            Verify Your Email
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4">
            We&apos;ve sent a verification link to your registered email address.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 mb-5 shadow-xs">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span className="tracking-tight font-medium">
              {getMaskedEmail(unconfirmedEmail || email)}
            </span>
          </div>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300">
              {successMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 mb-6">
            <a 
              href="mailto:" 
              className="w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#9E1315] via-[#BA1B1D] to-[#fd8a42] hover:from-[#851012] hover:to-[#9E1315] shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Email App</span>
            </a>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendCooldown > 0}
              className={`w-full h-11 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 select-none ${
                resendCooldown > 0
                  ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>
                {resendCooldown > 0 
                  ? `Resend Verification Email (${resendCooldown}s)` 
                  : 'Resend Verification Email'}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-6">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setMode('signin');
              }}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#9E1315] dark:text-rose-400 hover:underline transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>
          </div>

          <div className="pt-3 bg-slate-100/70 dark:bg-slate-900/60 rounded-xl p-3 flex items-start gap-2 text-left">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Link expires in 24 hours. Ensure to check your promotions or spam folder if the email does not show in your primary inbox.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FORGOT PASSWORD (Exact Google Stitch Design: 220fa0f4d8d84833a06df8a597c2e802) */}
      {/* ========================================================================= */}
      {mode === 'forgot' && (
        <div className="relative z-10 w-full max-w-lg mx-auto bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-7 sm:p-8 md:p-10 text-center transition-all my-auto animate-in fade-in zoom-in-95">
          {/* Ambient Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#9E1315]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src="/images/nadikomuniti-logo-transparent.png" 
              alt="Nadikomuniti Logo" 
              className="max-w-[180px] w-auto h-auto mx-auto object-contain mb-2"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl text-slate-900 dark:text-white mb-2 font-bold tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 font-normal">
            Enter your email address to reset your password.
          </p>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide" htmlFor="recovery-email">
                Registered Email Address
              </label>
              <div className="relative flex items-center">
                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@elmina.resident.my"
                  autoComplete="email"
                  required
                  className="h-11 sm:h-12 w-full rounded-xl bg-slate-50 dark:bg-slate-900/50 px-4 pl-11 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/30 focus:border-[#9E1315] shadow-inner transition-colors"
                />
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>Password reset requests are audited and limited to verified resident registered domains and council portals.</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#BA1B1D] via-[#D97706] to-[#E53935] shadow-lg hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-5 mt-2">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setMode('signin');
              }}
              className="text-xs sm:text-sm font-semibold text-[#9E1315] dark:text-rose-400 hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
