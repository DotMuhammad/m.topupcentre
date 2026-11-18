import React from 'react';
import { Bell, Globe, Moon, Search, Sun, Wifi, WifiOff } from 'lucide-react';
import { useTopup } from '../store/TopupContext';
import { PackageCategory } from '../types';

interface UtilityToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeCategory: PackageCategory;
  onCategoryChange: (cat: PackageCategory) => void;
  onOpenNotifications: () => void;
}

const CATEGORIES: { id: PackageCategory; label: string }[] = [
  { id: 'all', label: 'All Packages' },
  { id: 'starter', label: 'Starter (25–100)' },
  { id: 'popular', label: 'Popular (210–520)' },
  { id: 'mega', label: 'Mega Vault (1080+)' },
  { id: 'offers', label: 'Special Offers' },
];

export const UtilityToolbar: React.FC<UtilityToolbarProps> = ({
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  onOpenNotifications,
}) => {
  const { theme, toggleTheme, lang, setLang, unreadCount, isOnline } = useTopup();

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-5 sm:pb-6 border-b border-slate-200 dark:border-slate-800/80">
      {/* Row 1: Search & Utility Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 lg:max-w-md min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search diamond packs (e.g. 520, Squad)..."
            aria-label="Search diamond packages"
            className="w-full min-h-[44px] h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#12141D] text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Online / Offline Cache Indicator */}
          <div
            className={`min-h-[42px] px-3 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              isOnline
                ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12141D] text-slate-600 dark:text-slate-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <WifiOff className="w-3.5 h-3.5 shrink-0" />}
            <span>{isOnline ? 'Live Store' : 'Offline Cache'}</span>
          </div>

          {/* Multi-Language Toggle (EN / UR) */}
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
            className="min-h-[42px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{lang === 'en' ? 'EN / اردو' : 'اردو / EN'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="min-h-[42px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* Push Notifications Trigger */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="min-h-[42px] px-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            <Bell className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Alerts{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Interactive Category Filter Tabs */}
      <div className="flex items-center gap-1.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none pb-0.5">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] ${
                active
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-[#12141D] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
