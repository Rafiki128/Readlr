import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth.context.js';

interface RegisterProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { register, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !name || !password || !confirmPassword) {
      setLocalError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await register(email, password, confirmPassword, 'learner', name);
      setEmail('');
      setName('');
      setPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (err) {
      // Error is already handled by the auth context
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--accent-soft)] opacity-70" />
      <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-[var(--tint-yellow)] opacity-60" />
      <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-[#FB7185]" />
      <div className="absolute bottom-1/4 left-1/4 w-2 h-2 rounded-full bg-[#10B981]" />

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card rounded-2xl shadow-[0_1px_2px_rgba(31,36,48,0.04),0_8px_24px_-12px_rgba(31,36,48,0.10)] p-8 border border-[var(--hairline)]">
          {/* Header */}
          <div className="mb-8 text-center">
            <img
              src="/readlr-mark.svg"
              alt="Readlr"
              className="w-16 h-16 rounded-xl mx-auto mb-4 shadow-[0_4px_12px_-4px_rgba(79,70,229,0.2)]"
            />
            <h1 className="text-2xl font-semibold text-[var(--ink)] mb-1">Join Readlr</h1>
            <p className="text-[var(--ink-soft)] text-sm">Create your account to get started</p>
          </div>

          {/* Error Message */}
          {(error || localError) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--tint-red)] border border-[#FECACA] text-[#DC2626] px-4 py-3 rounded-xl mb-6 text-sm"
            >
              {error || localError}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[var(--ink)] font-medium text-sm mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border-2 border-[var(--gray-soft)] rounded-lg focus:outline-none focus:border-[#4F46E5] transition-colors bg-card text-[var(--ink)] placeholder-[#9CA3AF]"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-[var(--ink)] font-medium text-sm mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border-2 border-[var(--gray-soft)] rounded-lg focus:outline-none focus:border-[#4F46E5] transition-colors bg-card text-[var(--ink)] placeholder-[#9CA3AF]"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-[var(--ink)] font-medium text-sm mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border-2 border-[var(--gray-soft)] rounded-lg focus:outline-none focus:border-[#4F46E5] transition-colors bg-card text-[var(--ink)] placeholder-[#9CA3AF]"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[var(--ink-soft)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-[var(--ink)] font-medium text-sm mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border-2 border-[var(--gray-soft)] rounded-lg focus:outline-none focus:border-[#4F46E5] transition-colors bg-card text-[var(--ink)] placeholder-[#9CA3AF]"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[var(--ink-soft)] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-semibold py-3 rounded-lg hover:shadow-[0_2px_4px_rgba(31,36,48,0.05),0_18px_40px_-18px_rgba(79,70,229,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--gray-soft)]" />
            <span className="text-xs text-[#9CA3AF]">Already registered?</span>
            <div className="flex-1 h-px bg-[var(--gray-soft)]" />
          </div>

          {/* Switch to Login */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSwitchToLogin}
            className="w-full bg-card border-2 border-[#4F46E5] text-[#4F46E5] font-semibold py-3 rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
          >
            Sign In
          </motion.button>

          {/* Footer */}
          <p className="text-xs text-[#9CA3AF] text-center mt-6">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
};

