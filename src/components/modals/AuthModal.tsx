import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    isConfigured,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    loading,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    let success = false;
    if (mode === 'signup') {
      success = await registerWithEmail(email, password, displayName);
    } else {
      success = await loginWithEmail(email, password);
    }

    if (success) {
      onClose();
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    const success = await loginWithGoogle();
    if (success) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#FAFAF7] w-full max-w-md rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
              {isConfigured ? 'Firebase Authentication' : 'Demo Authentication Preview'}
            </span>
            <h2 id="auth-modal-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
              {mode === 'signin' ? 'Sign In to Your Account' : 'Create Seeker Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!isConfigured ? (
            <div className="p-3 bg-[#F0F6F2] rounded-xl border border-[#CCE0D3] flex items-start gap-2.5 text-xs text-[#214D35]">
              <Shield className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#183B28]">Hackathon Demo Authentication</p>
                <p className="text-[11px] text-[#3E614E] leading-relaxed">
                  Register or sign in below. Your account, assessment, and habit checkmarks will persist reliably across page refreshes and re-logins.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#F0F6F2] rounded-xl border border-[#CCE0D3] flex items-start gap-2.5 text-xs text-[#214D35]">
              <Shield className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#183B28]">Cloud Firebase Active</p>
                <p className="text-[11px] text-[#3E614E] leading-relaxed">
                  Connected to Cloud Firestore and Firebase Authentication.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-[#FBF2EE] rounded-xl border border-[#F0D5C9] text-xs text-[#A64B2A] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Priya Sundaram"
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seeker@ayushwellness.org"
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>
              <p className="text-[11px] text-[#526B5C] mt-1">
                Must be at least 6 characters.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] active:bg-[#1A3728] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4E8E3]" />
            </div>
            <div className="relative flex justify-center text-xs text-[#526B5C]">
              <span className="bg-[#FAFAF7] px-2">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-[#1E3F2E] bg-white hover:bg-slate-50 border border-[#CCD5CB] rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google Account</span>
          </button>

          <div className="pt-2 text-center text-xs text-[#526B5C]">
            {mode === 'signin' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setMode('signup');
                  }}
                  className="font-semibold text-[#2D5A43] underline"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setMode('signin');
                  }}
                  className="font-semibold text-[#2D5A43] underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
