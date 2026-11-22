import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Circle, Eye, EyeOff, Facebook } from 'lucide-react';
import { useAuth } from '../auth.context.js';
import { PASSWORD_RULES, isStrongPassword } from '../passwordRules.js';

interface RegisterProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { register, loginWithGoogle, loginWithFacebook, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [adminInvitation, setAdminInvitation] = useState('');
  const adminEmail = email.trim().toLowerCase().endsWith('@admin.readlr.com');
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password || !confirmPassword) {
      setLocalError('All fields are required');
      return;
    }

    if (!adminEmail && (!guardianConfirmed || !consent)) {
      setLocalError('Please confirm you are the guardian and agree to the privacy notice.');
      return;
    }

    if (!isStrongPassword(password)) {
      setLocalError('Your password does not meet all the requirements yet.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await register(email, password, confirmPassword, 'learner', { guardianConfirmed, consent }, adminEmail ? adminInvitation : undefined);
      setAdminInvitation('');
      setEmail('');
      setGuardianConfirmed(false);
      setConsent(false);
      setPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (err) {
      // Error is already handled by the auth context
    }
  };

  const handleGoogleLogin = () => {
    setLocalError(null);
    loginWithGoogle();
  };

  const handleFacebookLogin = () => {
    setLocalError(null);
    loginWithFacebook();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Brand-matched gradient glowing orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[45rem] h-[45rem] rounded-full bg-[#5b21b6] opacity-30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-[#10b981] opacity-30 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[25rem] h-[25rem] rounded-full bg-[#fbbf24] opacity-20 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[520px] relative z-10"
      >
        {/* Frosted Glass Card */}
        <div className="backdrop-blur-2xl bg-white/70 rounded-3xl shadow-[0_8px_32px_rgba(31,36,48,0.1)] p-6 sm:p-8 border border-white/40">
          {/* Header */}
          <div className="mb-6 text-center">
            <img
              src="/readlr_main_logo.svg"
              alt="Readlr"
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-contain mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Join Readlr</h1>
            <p className="text-slate-500 text-sm font-medium">For guardians: create an account for your child</p>
          </div>

          {/* Error Message */}
          {(error || localError) && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-red-50/90 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm font-medium flex items-start gap-2 shadow-sm"
            >
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error || localError}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {adminEmail && <div>
              <label htmlFor="admin-invitation" className="block text-sm font-medium mb-1.5 text-slate-800">Administrator invitation code</label>
              <input id="admin-invitation" type="password" autoComplete="off" required value={adminInvitation}
                onChange={event=>setAdminInvitation(event.target.value)} disabled={isLoading}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5b21b6] focus:ring-4 focus:ring-[#5b21b6]/10 transition-all bg-white/60"/>
              <p className="text-xs mt-1.5 text-slate-500">Use the private code provided by your Readlr system owner.</p>
            </div>}
            
            <div>
              <label htmlFor="guardian-email" className="block text-slate-800 font-medium text-sm mb-1.5">Guardian email</label>
              <input
                id="guardian-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guardian@example.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5b21b6] focus:ring-4 focus:ring-[#5b21b6]/10 transition-all bg-white/60 text-slate-900 placeholder-slate-400"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="guardian-password" className="block text-slate-800 font-medium text-sm mb-1.5">Create a password</label>
              <div className="relative">
                <input
                  id="guardian-password"
                  autoComplete="new-password"
                  aria-describedby="password-rules"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5b21b6] focus:ring-4 focus:ring-[#5b21b6]/10 transition-all bg-white/60 text-slate-900 placeholder-slate-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5b21b6] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <ul id="password-rules" aria-label="Password requirements" className="mt-2 grid grid-cols-2 gap-y-1 px-1">
                {PASSWORD_RULES.map(rule => {
                  const met = rule.test(password);
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${met ? 'text-[#10B981]' : 'text-slate-400'}`}>
                      {met ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Circle className="w-3.5 h-3.5" aria-hidden="true" />}
                      <span>{rule.label}<span className="sr-only">{met ? ' (met)' : ' (not met yet)'}</span></span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label htmlFor="guardian-confirm-password" className="block text-slate-800 font-medium text-sm mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  id="guardian-confirm-password"
                  autoComplete="new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5b21b6] focus:ring-4 focus:ring-[#5b21b6]/10 transition-all bg-white/60 text-slate-900 placeholder-slate-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5b21b6] transition-colors p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!adminEmail && <>
              {/* Refined Privacy Callout Box */}
              <section aria-labelledby="privacy-notice-title" className="bg-[#5b21b6]/5 border border-[#5b21b6]/10 rounded-xl p-4 text-[13px] text-slate-700 space-y-2 shadow-inner">
                <h2 id="privacy-notice-title" className="font-semibold text-[#5b21b6] flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Privacy notice for guardians
                </h2>
                <div className="space-y-1.5 leading-relaxed">
                  <p><strong>What we collect:</strong> your email, your child's nickname, avatar, grade, and reading progress.</p>
                  <p><strong>Microphone:</strong> Readlr uses the microphone when your child reads aloud. The audio is sent to Groq for speech recognition and is not stored.</p>
                  <p><strong>How long we keep it:</strong> reading progress is kept for [PLACEHOLDER: retention period].</p>
                  <p><strong>Deleting data:</strong> Delete account from Settings &gt; Privacy &amp; Safety to remove all data.</p>
                </div>
              </section>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-3 text-sm text-slate-800 cursor-pointer group">
                  <input type="checkbox" checked={guardianConfirmed} onChange={(e) => setGuardianConfirmed(e.target.checked)}
                    disabled={isLoading} className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#5b21b6] rounded border-slate-300 focus:ring-2 focus:ring-[#5b21b6] focus:ring-offset-1 transition-all" />
                  <span className="leading-snug group-hover:text-slate-900 text-slate-600 transition-colors">I am this child's guardian, and I am 18 years or older.</span>
                </label>

                <label className="flex items-start gap-3 text-sm text-slate-800 cursor-pointer group">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                    disabled={isLoading} className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#5b21b6] rounded border-slate-300 focus:ring-2 focus:ring-[#5b21b6] focus:ring-offset-1 transition-all" />
                  <span className="leading-snug group-hover:text-slate-900 text-slate-600 transition-colors">I have read the privacy notice and agree to my child using Readlr.</span>
                </label>
              </div>
            </>}

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || !isStrongPassword(password) || (!adminEmail && (!guardianConfirmed || !consent))}
              className="w-full bg-gradient-to-r from-[#5b21b6] to-[#0ea5e9] text-white font-semibold py-3 mt-3 rounded-xl hover:shadow-[0_2px_12px_rgba(91,33,182,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-medium tracking-wider uppercase text-slate-400">Or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Social Login Buttons */}
          <div className="flex gap-3 mb-6">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl hover:bg-white hover:border-slate-300 transition-all text-slate-700 font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white/60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </motion.button>
            
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleFacebookLogin}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#1877F2] bg-[#1877F2]/95 text-white rounded-xl hover:bg-[#166FE5] transition-all font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            >
              <Facebook className="w-4 h-4 fill-current" />
              Facebook
            </motion.button>
          </div>

          {/* Footer Navigation */}
          <div className="text-center pt-2">
            <p className="text-[13px] text-slate-500">
              Already have an account?{' '}
              <button 
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold text-[#5b21b6] hover:text-[#4c1d95] hover:underline underline-offset-2 transition-colors"
              >
                Sign In instead
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};