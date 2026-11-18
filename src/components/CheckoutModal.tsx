import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  Printer,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTopup } from '../store/TopupContext';
import { DiamondPackage, Order, PaymentMethod } from '../types';
import { formatDateTime, formatPkr } from '../utils/exportCsv';
import { PlayerProfileCard } from './PlayerProfileCard';

interface CheckoutModalProps {
  pkg: DiamondPackage | null;
  initialPromo?: string;
  onClose: () => void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: 'jazzcash', label: 'JazzCash', hint: 'Mobile Account & MPIN' },
  { id: 'easypaisa', label: 'EasyPaisa', hint: 'Mobile Wallet & Telenor' },
  { id: 'wallet', label: 'SadaPay / NayaPay', hint: 'Local Digital Wallet' },
  { id: 'card', label: 'Credit / Debit Card', hint: 'Visa & Mastercard PKR' },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ pkg, initialPromo, onClose }) => {
  const {
    playerProfile,
    verifyingPlayer,
    playerVerifyError,
    verifyPlayerId,
    clearPlayerProfile,
    placeOrder,
    session,
    setView,
    showToast,
  } = useTopup();

  const [uidInput, setUidInput] = useState('');
  const [region, setRegion] = useState('PK');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('jazzcash');
  const [accountNumber, setAccountNumber] = useState(session?.phone || '0301-4829104');
  const [mpinOrCvv, setMpinOrCvv] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [customerEmail, setCustomerEmail] = useState(session?.email || '');
  const [promoCode, setPromoCode] = useState(initialPromo || '');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountPkr: number } | null>(
    () => {
      if (initialPromo?.toUpperCase() === 'MTC10' && pkg && pkg.pricePkr >= 1000) {
        return { code: 'MTC10', discountPkr: 50 };
      }
      return null;
    }
  );
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!pkg) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pkg, onClose]);

  if (!pkg) return null;

  const discountPkr = promoApplied?.discountPkr ?? 0;
  const finalTotal = Math.max(0, pkg.pricePkr - discountPkr);

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (code === 'MTC10') {
      if (pkg.pricePkr < 1000) {
        setFormError('Promo code MTC10 requires a minimum package value of PKR 1,000.');
        return;
      }
      setFormError('');
      setPromoApplied({ code: 'MTC10', discountPkr: 50 });
      showToast('Promo Applied', 'PKR 50 discount applied with MTC10.', 'success');
    } else if (code === 'BOOYAH5') {
      setFormError('');
      setPromoApplied({ code: 'BOOYAH5', discountPkr: 25 });
      showToast('Promo Applied', 'PKR 25 discount applied with BOOYAH5.', 'success');
    } else {
      setFormError('Invalid promo code. Try MTC10 or BOOYAH5.');
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!playerProfile) {
      setFormError('Please verify a real Free Fire Player ID via the lookup API before paying.');
      return;
    }

    if (accountNumber.trim().length < 7) {
      setFormError(
        paymentMethod === 'card'
          ? 'Please enter a valid 16-digit card number.'
          : 'Please enter a valid Pakistani mobile wallet number (e.g. 0301-1234567).'
      );
      return;
    }

    if (mpinOrCvv.trim().length < 3) {
      setFormError(
        paymentMethod === 'card'
          ? 'Enter your 3-digit card CVV.'
          : 'Enter your 4-digit wallet PIN / Transaction confirmation code.'
      );
      return;
    }

    if (!customerEmail.includes('@')) {
      setFormError('Enter an email address to receive your automated purchase receipt.');
      return;
    }

    setSubmitting(true);
    await new Promise((res) => setTimeout(res, 650));

    const prefix =
      paymentMethod === 'jazzcash'
        ? 'JC'
        : paymentMethod === 'easypaisa'
        ? 'EP'
        : paymentMethod === 'wallet'
        ? 'WL'
        : 'CD';
    const txRef = `${prefix}-${Math.floor(1000000 + Math.random() * 8999999)}`;

    const order = placeOrder({
      pkg,
      paymentMethod,
      paymentAccount: accountNumber.trim(),
      transactionRef: txRef,
      customerPhone: paymentMethod === 'card' ? session?.phone || '0300-0000000' : accountNumber.trim(),
      customerEmail: customerEmail.trim(),
      promoCode: promoApplied?.code,
      discountPkr,
    });

    setSubmitting(false);
    setConfirmedOrder(order);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diamond Top-Up Checkout"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full sm:max-w-2xl rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {confirmedOrder ? `Receipt · ${confirmedOrder.id}` : `Checkout · ${pkg.title}`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {confirmedOrder
                ? 'Automated email receipt dispatched and order queued'
                : 'Verify Player ID via live API and pay in PKR'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto overscroll-contain">
            <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm min-w-0">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Payment Verified & Top-Up Queued
                </p>
                <p className="text-slate-600 dark:text-slate-300 break-words">
                  An automated receipt has been sent to{' '}
                  <span className="font-medium break-all">{confirmedOrder.customerEmail}</span>.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090A0F] p-4 sm:p-5 space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Muhammad Topup Centre Receipt
                </span>
                <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTime(confirmedOrder.createdAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs sm:text-sm">
                <span className="text-slate-500 dark:text-slate-400">Order Reference</span>
                <span className="text-right font-mono-tabular font-semibold text-slate-900 dark:text-white break-all">
                  {confirmedOrder.id}
                </span>
                <span className="text-slate-500 dark:text-slate-400">Player Nickname</span>
                <span className="text-right font-semibold text-slate-900 dark:text-white truncate">
                  {confirmedOrder.playerNickname}
                </span>
                <span className="text-slate-500 dark:text-slate-400">Player UID</span>
                <span className="text-right font-mono-tabular text-slate-900 dark:text-white">
                  {confirmedOrder.playerUid} ({confirmedOrder.playerRegion})
                </span>
                <span className="text-slate-500 dark:text-slate-400">Diamonds Credited</span>
                <span className="text-right font-mono-tabular text-sky-600 dark:text-sky-400 font-semibold">
                  {confirmedOrder.diamonds}
                  {confirmedOrder.bonusDiamonds > 0 ? ` + ${confirmedOrder.bonusDiamonds} Bonus` : ''}
                </span>
                <span className="text-slate-500 dark:text-slate-400">Payment Gateway</span>
                <span className="text-right uppercase font-medium text-slate-900 dark:text-white break-all">
                  {confirmedOrder.paymentMethod} · {confirmedOrder.transactionRef}
                </span>
                <span className="text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold">
                  Total Paid
                </span>
                <span className="text-right pt-2 border-t border-slate-200 dark:border-slate-800 font-mono-tabular font-bold text-base text-slate-900 dark:text-white">
                  {formatPkr(confirmedOrder.amountPkr)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>

              <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setView('orders');
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold hover:opacity-90 cursor-pointer"
                >
                  Track Status
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmPayment} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto overscroll-contain">
              {/* Step 1: Live Player ID Verification */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090A0F] p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>1. Target Free Fire Account (Live API)</span>
                  <span className="font-mono-tabular text-sky-600 dark:text-sky-400">
                    {pkg.diamonds}
                    {pkg.bonusDiamonds > 0 ? ` + ${pkg.bonusDiamonds}` : ''} Diamonds
                  </span>
                </div>

                {playerProfile ? (
                  <PlayerProfileCard
                    profile={playerProfile}
                    compact
                    onChangeUid={() => {
                      clearPlayerProfile();
                      setUidInput('');
                    }}
                  />
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={uidInput}
                        onChange={(e) => setUidInput(e.target.value)}
                        placeholder="Enter 8–12 digit Player UID"
                        aria-label="Free Fire Player UID"
                        className="flex-1 min-w-0 min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#12141D] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                      />
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        aria-label="Server Region"
                        className="min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#12141D] text-base sm:text-sm text-slate-900 dark:text-white w-full sm:w-auto"
                      >
                        <option value="PK">Pakistan (PK)</option>
                        <option value="SG">Singapore (SG)</option>
                        <option value="ME">Middle East (ME)</option>
                        <option value="IND">India (IND)</option>
                        <option value="ID">Indonesia (ID)</option>
                        <option value="BR">Brazil (BR)</option>
                        <option value="GLOBAL">Global</option>
                      </select>
                      <button
                        type="button"
                        disabled={verifyingPlayer}
                        onClick={() => verifyPlayerId(uidInput, region)}
                        className="w-full sm:w-auto min-h-[44px] h-11 px-4 rounded-lg bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center"
                      >
                        {verifyingPlayer ? 'Checking...' : 'Verify UID'}
                      </button>
                    </div>
                    {playerVerifyError && (
                      <p role="alert" className="text-xs text-rose-500 leading-relaxed break-words">
                        {playerVerifyError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Payment Method */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  2. Select Payment Gateway (PKR)
                </label>
                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const selected = paymentMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id)}
                        className={`min-h-[58px] p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'border-rose-500 bg-rose-500/10'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090A0F] hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {opt.label}
                          </span>
                          {opt.id === 'card' ? (
                            <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : opt.id === 'wallet' ? (
                            <Wallet className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {opt.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Gateway Credentials & Automated Receipt Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {paymentMethod === 'card'
                      ? 'Card Number'
                      : `${PAYMENT_OPTIONS.find((p) => p.id === paymentMethod)?.label} Mobile Number`}
                  </label>
                  <input
                    type="text"
                    inputMode={paymentMethod === 'card' ? 'numeric' : 'tel'}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={paymentMethod === 'card' ? '4242 •••• •••• 4242' : '0301-4829104'}
                    className="w-full min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>

                {paymentMethod === 'card' ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Expiry
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="09/28"
                        className="w-full min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                        CVV
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={mpinOrCvv}
                        onChange={(e) => setMpinOrCvv(e.target.value)}
                        placeholder="•••"
                        className="w-full min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      4-Digit Wallet MPIN / OTP
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={mpinOrCvv}
                      onChange={(e) => setMpinOrCvv(e.target.value)}
                      placeholder="••••"
                      className="w-full min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Email Address for Automated Receipt
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full min-h-[44px] h-11 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Promo code (e.g. MTC10)"
                  aria-label="Promo code"
                  className="flex-1 min-w-0 min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="min-h-[44px] h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>

              {formError && (
                <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-500">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </p>
              )}
            </div>

            {/* Sticky Bottom Checkout Action Bar */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0D0F16] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex sm:block items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">Total Payable:</span>
                  <span className="font-mono-tabular text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {formatPkr(finalTotal)}
                  </span>
                </div>
                {discountPkr > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono-tabular">
                    -{formatPkr(discountPkr)} ({promoApplied?.code})
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !playerProfile}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pay {formatPkr(finalTotal)}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
