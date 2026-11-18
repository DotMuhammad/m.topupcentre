import React, { useEffect, useState } from 'react';
import { Globe, Menu, Moon, Sun, User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTopup } from '../store/TopupContext';
import { TRANSLATIONS } from '../data/seedData';
import { StoreView } from '../types';

interface NavbarProps {
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { view, setView, lang, setLang, theme, toggleTheme, session } = useTopup();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const handleNavClick = (targetView: StoreView, sectionId?: string) => {
    setView(targetView);
    setMobileMenuOpen(false);
    if (targetView === 'store' && sectionId) {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#090A0F]/92 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('store')}
          className="flex items-center gap-2 sm:gap-2.5 text-left min-w-0 shrink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-md py-1 cursor-pointer"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0 sm:w-6 sm:h-6"
          >
            <path
              d="M12 2L21 9.5L12 22L3 9.5L12 2Z"
              className="fill-rose-600/20 stroke-rose-500"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            <path
              d="M12 2L16 9.5L12 22L8 9.5L12 2Z"
              className="fill-amber-400/25 stroke-amber-400"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-display text-[15px] min-[360px]:text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {t.brand}
          </span>
        </button>

        {/* Zone 2: Desktop Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <button
            type="button"
            onClick={() => handleNavClick('store', 'diamond-store')}
            className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
              view === 'store'
                ? 'border-rose-500 text-slate-900 dark:text-white'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.navStore}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('store', 'how-to-topup')}
            className="whitespace-nowrap shrink-0 py-1.5 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t.navHow}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('orders')}
            className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
              view === 'orders'
                ? 'border-rose-500 text-slate-900 dark:text-white'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.navOrders}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('store', 'reviews-section')}
            className="whitespace-nowrap shrink-0 py-1.5 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t.navReviews}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('admin')}
            className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
              view === 'admin'
                ? 'border-amber-400 text-slate-900 dark:text-amber-300'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.navAdmin}
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenAuth}
            className="min-h-[40px] sm:min-h-[40px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white transition-all whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 max-w-[120px] sm:max-w-none"
          >
            <User className="w-3.5 h-3.5 shrink-0 sm:hidden" />
            <span className="truncate">{session ? session.displayName : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-nav-drawer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D0F16] px-4 py-3 space-y-1.5 shadow-xl"
          >
            <nav aria-label="Mobile Navigation" className="space-y-1">
              <button
                type="button"
                onClick={() => handleNavClick('store', 'diamond-store')}
                className={`flex items-center justify-between w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  view === 'store'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{t.navStore}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('store', 'how-to-topup')}
                className="flex items-center justify-between w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>{t.navHow}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('orders')}
                className={`flex items-center justify-between w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  view === 'orders'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{t.navOrders}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('store', 'reviews-section')}
                className="flex items-center justify-between w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>{t.navReviews}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('admin')}
                className={`flex items-center justify-between w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  view === 'admin'
                    ? 'bg-amber-400/15 text-amber-600 dark:text-amber-300 font-semibold'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{t.navAdmin}</span>
              </button>
            </nav>

            <div className="pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
                className="min-h-[44px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12141D] text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{lang === 'en' ? 'اردو / EN' : 'EN / اردو'}</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-[44px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12141D] text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
