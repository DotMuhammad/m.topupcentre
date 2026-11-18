import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useTopup } from '../store/TopupContext';
import { HERO_BANNER_IMAGE, TRANSLATIONS } from '../data/seedData';
import { PlayerProfileCard } from './PlayerProfileCard';

export const HeroSection: React.FC = () => {
  const {
    lang,
    uidApiStatus,
    playerProfile,
    verifyingPlayer,
    playerVerifyError,
    verifyPlayerId,
    clearPlayerProfile,
  } = useTopup();
  const t = TRANSLATIONS[lang];

  const [uidInput, setUidInput] = useState(playerProfile?.uid ?? '');
  const [region, setRegion] = useState(playerProfile?.region ?? 'PK');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyPlayerId(uidInput, region);
  };

  const scrollToStore = () => {
    document.getElementById('diamond-store')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090A0F]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(225,29,72,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(124,58,237,0.08),transparent_55%)]"
      />

      <div className="relative max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-10 sm:pb-10 lg:pt-14 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-stretch">
          {/* Left Column: Headline, Live Player UID Lookup & Primary CTA */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-5 sm:gap-6 min-w-0">
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm font-medium tracking-wide text-amber-600 dark:text-amber-400">
                {t.heroKicker}
              </p>

              <h1
                className="font-display font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08]"
                style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3.5rem)', textWrap: 'balance' }}
              >
                {t.heroTitle}
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {t.heroSubtitle}
              </p>
            </div>

            {/* Integrated Real-Time Player ID Verification Module */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#12141D] p-3.5 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                  Step 1 · Live Free Fire Player ID Lookup
                </span>
                {uidApiStatus.checked && (
                  <span
                    className={`text-[11px] sm:text-xs font-medium truncate max-w-full ${
                      uidApiStatus.uidApiConfigured
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {uidApiStatus.uidApiConfigured
                      ? `Live API (${uidApiStatus.providerHost || 'Connected'})`
                      : 'API Endpoint Required'}
                  </span>
                )}
              </div>

              {playerProfile ? (
                <PlayerProfileCard
                  profile={playerProfile}
                  onChangeUid={() => {
                    clearPlayerProfile();
                    setUidInput('');
                  }}
                />
              ) : (
                <form onSubmit={handleVerifySubmit} className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={uidInput}
                      onChange={(e) => setUidInput(e.target.value)}
                      placeholder={t.verifyUidPlaceholder}
                      aria-label="Free Fire Player ID"
                      className="flex-1 min-w-0 min-h-[44px] h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white font-mono-tabular placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      aria-label="Server Region"
                      className="min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 sm:w-auto w-full"
                    >
                      <option value="PK">Pakistan (PK)</option>
                      <option value="SG">Singapore (SG)</option>
                      <option value="ME">Middle East (ME)</option>
                      <option value="IND">India (IND)</option>
                      <option value="ID">Indonesia (ID)</option>
                      <option value="BD">Bangladesh (BD)</option>
                      <option value="BR">Brazil (BR)</option>
                      <option value="US">North America (US)</option>
                      <option value="GLOBAL">Global</option>
                    </select>
                    <button
                      type="submit"
                      disabled={verifyingPlayer}
                      className="w-full sm:w-auto min-h-[44px] h-11 px-4 rounded-lg bg-slate-900 dark:bg-amber-400 hover:bg-slate-800 dark:hover:bg-amber-300 active:scale-[0.98] text-white dark:text-slate-950 text-sm font-semibold transition-all whitespace-nowrap shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      {verifyingPlayer ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t.verifying}</span>
                        </>
                      ) : (
                        <span>{t.verifyBtn}</span>
                      )}
                    </button>
                  </div>

                  {/* Loading Skeleton while querying live API */}
                  {verifyingPlayer && (
                    <div
                      aria-live="polite"
                      className="pt-2 flex items-center gap-3 animate-pulse"
                    >
                      <div className="w-11 h-11 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3.5 w-36 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-2.5 w-52 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
                      </div>
                    </div>
                  )}

                  {!verifyingPlayer && playerVerifyError && (
                    <p
                      role="alert"
                      className="flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400 leading-relaxed break-words"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{playerVerifyError}</span>
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Primary Action */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={scrollToStore}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold text-sm sm:text-base transition-all duration-150 inline-flex items-center justify-center gap-2.5 shadow-lg shadow-rose-950/30 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span>{t.buyNowCta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Password-free UID delivery · Automated PKR receipts</span>
              </div>
            </div>
          </div>

          {/* Right Column: Full-bleed 16:9 Gaming Visual */}
          <div className="lg:col-span-6 flex min-w-0">
            <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#12141D] aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[380px]">
              {!heroImgFailed ? (
                <img
                  src={HERO_BANNER_IMAGE}
                  alt="Free Fire esports tactical warrior holding crystalline blue diamonds"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="async"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-[#12141D] via-[#1B1224] to-[#090A0F] text-center">
                  <span className="font-display text-lg sm:text-xl font-bold text-white">
                    Muhammad Topup Centre
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 mt-1">
                    Free Fire Diamond Storefront
                  </span>
                </div>
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#090A0F]/90 via-[#090A0F]/25 to-transparent"
              />
              <div className="absolute bottom-3 sm:bottom-4 left-3.5 sm:left-4 right-3.5 sm:right-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-200">
                <span className="font-medium">Direct UID Top-Up · Pakistan Region Ready</span>
                <span className="font-mono-tabular text-amber-300 font-semibold">
                  JazzCash · EasyPaisa
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Trust & KPI Strip Below Hero Split */}
        <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="min-w-0">
            <p className="font-mono-tabular text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
              1–3 Min
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">
              Typical UID dispatch speed
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono-tabular text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
              PKR Local
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">
              JazzCash, EasyPaisa & Cards
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono-tabular text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
              9 Packages
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">
              From 25 to 5,600 Diamonds
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono-tabular text-lg sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="truncate">Live UID Check</span>
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">
              Real API verification, zero mock data
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
