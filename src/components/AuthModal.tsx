import React, { useEffect, useState } from 'react';
import { Fingerprint, KeyRound, LogOut, Phone, Shield, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useTopup } from '../store/TopupContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { session, loginWithOtp, loginWithSocial, loginWithBiometric, toggleBiometric, logout, showToast } =
    useTopup();

  const [phone, setPhone] = useState('0301-4829104');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Enter a valid Pakistani mobile number (e.g. 0301-4829104).');
      return;
    }
    setError('');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtpSent(true);
    showToast(`SMS OTP Sent to ${phone}`, `Your 6-digit verification code is ${code}`, 'info');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.trim() !== generatedOtp) {
      setError(`Incorrect OTP code. Expected ${generatedOtp} from SMS alert.`);
      return;
    }
    setError('');
    loginWithOtp(phone, email);
    setOtpSent(false);
    setOtpInput('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Player Authentication"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col"
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {session ? 'Player Account' : 'Sign In · Phone & OTP'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {session ? (
            <div className="p-4 sm:p-6 space-y-5">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090A0F] p-4 space-y-1.5 min-w-0">
                <p className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                  {session.displayName}
                </p>
                <p className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 break-words">
                  Phone: {session.phone} · {session.email}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Authenticated via {session.authProvider.replace('_', ' ').toUpperCase()}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 py-2 border-y border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Fingerprint className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Biometric Passkey Unlock
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Allow quick device unlock on return visits
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleBiometric(!session.biometricEnabled)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
                    session.biometricEnabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {session.biometricEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full min-h-[44px] py-2.5 rounded-lg border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-5">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Mobile Number (Pakistan)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0301-4829104"
                        className="w-full min-h-[44px] h-11 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Receipt Email (optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.pk"
                      className="w-full min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  {error && <p className="text-xs text-rose-500">{error}</p>}

                  <button
                    type="submit"
                    className="w-full min-h-[46px] py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer"
                  >
                    Send 6-Digit OTP
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
                    Demo SMS OTP for <span className="font-mono-tabular font-semibold">{phone}</span>:{' '}
                    <span className="font-mono-tabular font-bold">{generatedOtp}</span>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Enter 6-Digit OTP
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="123456"
                        className="w-full min-h-[44px] h-11 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  {error && <p className="text-xs text-rose-500">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 min-h-[44px] py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold cursor-pointer"
                    >
                      Verify & Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* Quick Biometric & Social Sign-In */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                  Or continue with passkey & social sign-in
                </p>
                <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      loginWithBiometric();
                      onClose();
                    }}
                    className="min-h-[44px] py-2 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Passkey</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loginWithSocial('google');
                      onClose();
                    }}
                    className="min-h-[44px] py-2 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loginWithSocial('facebook');
                      onClose();
                    }}
                    className="min-h-[44px] py-2 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Facebook</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
