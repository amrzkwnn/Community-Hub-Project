'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  MapPin, 
  Home, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  MailCheck, 
  ShieldCheck, 
  ChevronRight,
  Shield,
  Layers,
  Activity,
  HeartHandshake
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AuthView() {
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    tryDemo,
    t 
  } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'verify' | 'forgot'>('signin');
  
  // Sign In & Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up fields
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [precinct, setPrecinct] = useState('Elmina West (EV1)');
  const [unitNumber, setUnitNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const supabase = createClient();

  // Read URL query parameters on initial mount (e.g. from email verification callback)
  React.useEffect(() => {
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

  // Handle Sign Up submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full name as registered in the township directory.');
      return;
    }
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
      setErrorMessage('Please accept the Community Conduct Guidelines to proceed.');
      return;
    }

    setIsLoading(true);
    const result = await signUpWithEmail({
      email: cleanEmail,
      password,
      fullName: cleanName,
      precinct,
      unitNumber: unitNumber.trim() || undefined,
    });
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to create account. Please try again.');
      return;
    }

    if (result.requiresEmailConfirmation) {
      setUnconfirmedEmail(cleanEmail);
      setMode('verify');
    } else {
      setSuccessMessage('Account created successfully! Entering Nadikomuniti...');
    }
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
        setSuccessMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox.`);
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Failed to send reset instructions. Please try again.');
    }
  };

  // Handle Resend Verification Email
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
    }, 400);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-y-auto">
      {/* Background Image with Blur & Dark Scrim */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 scale-105"
        style={{ backgroundImage: `url('/images/elmina-township-bg.png')` }}
      >
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-[#9E1315]/20" />
      </div>

      {/* Center Auth Card */}
      <div className="relative z-10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-xl flex flex-col lg:flex-row my-auto animate-in fade-in zoom-in-95 duration-300">
        
        {/* ========================================================================= */}
        {/* LEFT BRANDING COLUMN (Stitch Design approved aesthetics)                 */}
        {/* ========================================================================= */}
        <div className="lg:w-[45%] p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-[#9E1315] via-[#851012] to-[#5C0A0B] text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle geometric pattern glow */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          {/* Top Logo & Title */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-rose-100 mb-6 tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Official Township Hub • Bandar Elmina</span>
            </div>

            <div className="flex items-center gap-3.5 mb-3">
              <img 
                src="/images/nadikomuniti-logo-transparent.png" 
                alt="Nadikomuniti Logo" 
                className="w-12 h-12 object-contain drop-shadow-md rounded-xl"
              />
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm font-sans">
                  Nadikomuniti
                </h1>
                <p className="text-xs sm:text-sm font-medium text-rose-100/90 tracking-wide">
                  Connect & Relax
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-rose-100/80 leading-relaxed max-w-sm mt-3">
              The unified civic engagement, mediated neighbor messaging, and anti-flood resilience network for Elmina residents.
            </p>
          </div>

          {/* Core Pillars List */}
          <div className="relative z-10 my-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wide">Mediated Private Messaging</h2>
                <p className="text-[11px] text-rose-100/75 leading-tight mt-0.5">
                  Direct communication with adjoining homeowners without revealing personal phone numbers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wide">Flood & Resilience Telemetry</h2>
                <p className="text-[11px] text-rose-100/75 leading-tight mt-0.5">
                  Real-time IoT water sensors, culvert status alerts, and rapid verified report dispatch.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wide">Circular Exchange & Aid</h2>
                <p className="text-[11px] text-rose-100/75 leading-tight mt-0.5">
                  Free item giveaways, verified local handyman services, and mutual neighborhood support.
                </p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[10px] text-rose-200/80">
            <span>TESDH Community Hub • 2026</span>
            <span>Sime Darby Property Innovation</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT FORM COLUMN                                                         */}
        {/* ========================================================================= */}
        <div className="lg:w-[55%] p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white dark:bg-[#15181C]">
          
          {/* 1. SIGN IN MODE */}
          {mode === 'signin' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Log in to your verified resident account to access the community hub.
                </p>
              </div>

              {/* Feedback Alert Banners */}
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

              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="resident@elmina.my"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs font-semibold text-[#9E1315] dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#9E1315] focus:ring-[#9E1315] border-slate-300 dark:border-slate-700"
                    />
                    <span>Remember my session</span>
                  </label>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-[#9E1315] to-[#BA1B1D] hover:from-[#851012] hover:to-[#A01719] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Community Hub</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Safe Demo Bypass Separator */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <span className="relative px-3 bg-white dark:bg-[#15181C] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  or preview without login
                </span>
              </div>

              {/* Try Demo Button (Requirement Part 11) */}
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
              <p className="text-[10px] text-center text-slate-400 mt-1.5">
                Safe synthetic test environment • Management changes and private data are protected.
              </p>

              {/* Link to Sign Up */}
              <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
                Don&apos;t have a resident account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('signup');
                  }}
                  className="font-bold text-[#9E1315] dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* 2. SIGN UP MODE */}
          {mode === 'signup' && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Create Resident Account
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Register with your township details to access community messaging and resilience tools.
                </p>
              </div>

              {/* Feedback Alert Banners */}
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

              <form onSubmit={handleSignUp} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name (As registered in township)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Nurul Huda binti Ahmad"
                      required
                      className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="resident@elmina.my"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Township Precinct & Unit Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Township Precinct
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={precinct}
                        onChange={(e) => setPrecinct(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                      >
                        <option value="Elmina West (EV1)">Elmina West (EV1)</option>
                        <option value="Elmina West (EV2)">Elmina West (EV2)</option>
                        <option value="Elmina East">Elmina East</option>
                        <option value="Elmina Green 1">Elmina Green 1</option>
                        <option value="Elmina Green 3">Elmina Green 3</option>
                        <option value="Elmina Ridge">Elmina Ridge</option>
                        <option value="Denai Alam">Denai Alam</option>
                        <option value="Bandar Elmina (Other)">Bandar Elmina (Other)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      House / Unit (Optional)
                    </label>
                    <div className="relative">
                      <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={unitNumber}
                        onChange={(e) => setUnitNumber(e.target.value)}
                        placeholder="e.g. EW-12"
                        className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 chars"
                        required
                        className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        required
                        className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms agreement */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 rounded text-[#9E1315] focus:ring-[#9E1315] border-slate-300 dark:border-slate-700 shrink-0 mt-0.5"
                    />
                    <span>
                      I agree to the Community Conduct Guidelines & Mediated Privacy Bylaws. Account creation grants default Resident privileges.
                    </span>
                  </label>
                </div>

                {/* Submit Sign Up Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-[#9E1315] to-[#BA1B1D] hover:from-[#851012] hover:to-[#A01719] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Resident Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Link to Sign In */}
              <div className="mt-5 text-center text-xs text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('signin');
                  }}
                  className="font-bold text-[#9E1315] dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* 3. VERIFY EMAIL MODE (Stitch design approved screen) */}
          {mode === 'verify' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-[#9E1315] dark:text-rose-300 mx-auto flex items-center justify-center mb-5 ring-8 ring-rose-50 dark:ring-rose-950/30">
                <MailCheck className="w-8 h-8" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Check Your Email
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
                We sent a secure confirmation link to <span className="font-semibold text-slate-900 dark:text-white">{unconfirmedEmail || 'your email'}</span>. Click the link to complete account verification and log in.
              </p>

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

              <div className="space-y-3 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend Email in ${resendCooldown}s` : 'Resend Verification Email'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('signin');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#9E1315] hover:bg-[#851012] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* 4. FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Reset Password
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Enter your registered email address and we will send you instructions to reset your password.
                </p>
              </div>

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

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="resident@elmina.my"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9E1315] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#9E1315] hover:bg-[#851012] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <span>Send Password Reset Link</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode('signin');
                    }}
                    className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
