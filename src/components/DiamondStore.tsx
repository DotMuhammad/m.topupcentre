import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Gem, Tag } from 'lucide-react';
import { useTopup } from '../store/TopupContext';
import { DiamondPackage, PackageCategory } from '../types';
import { PROMO_CRATE_IMAGE, TRANSLATIONS } from '../data/seedData';
import { formatPkr } from '../utils/exportCsv';
import { UtilityToolbar } from './UtilityToolbar';

interface DiamondStoreProps {
  onSelectPackage: (pkg: DiamondPackage, prefillPromo?: string) => void;
  onOpenNotifications: () => void;
}

export const DiamondStore: React.FC<DiamondStoreProps> = ({
  onSelectPackage,
  onOpenNotifications,
}) => {
  const { packages, lang, showToast } = useTopup();
  const t = TRANSLATIONS[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PackageCategory>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [promoBannerFailed, setPromoBannerFailed] = useState(false);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (activeCategory === 'offers') {
        if (!pkg.discountPercent && !pkg.offerLabel && pkg.bonusDiamonds === 0) return false;
      } else if (activeCategory !== 'all' && pkg.category !== activeCategory) {
        return false;
      }

      if (!q) return true;
      return (
        pkg.title.toLowerCase().includes(q) ||
        String(pkg.diamonds).includes(q) ||
        (pkg.offerLabel && pkg.offerLabel.toLowerCase().includes(q)) ||
        pkg.category.toLowerCase().includes(q)
      );
    });
  }, [packages, activeCategory, searchQuery]);

  const stockLabel = (status: DiamondPackage['stockStatus']) => {
    if (status === 'out_of_stock') return 'Out of Stock';
    if (status === 'low_stock') return 'Low Stock';
    return 'In Stock';
  };

  return (
    <section
      id="diamond-store"
      className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 space-y-6 sm:space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-4">
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.storeHeading}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t.storeSub}
          </p>
        </div>
        <p className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
          Showing {filteredPackages.length} of {packages.length} packages
        </p>
      </div>

      <UtilityToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onOpenNotifications={onOpenNotifications}
      />

      {/* Package Grid: 2-col Mobile, 3-col Tablet, 4-col Desktop */}
      {filteredPackages.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12141D] p-8 sm:p-12 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            No matching diamond packages
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Try clearing your search query or switching to All Packages.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-500 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
          {filteredPackages.map((pkg) => {
            const isOut = pkg.stockStatus === 'out_of_stock';
            const imgFailed = failedImages[pkg.id];

            return (
              <article
                key={pkg.id}
                className="group rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#12141D] overflow-hidden flex flex-col min-w-0 transition-transform duration-150 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Uniform 4:3 Visual Container */}
                <div className="relative aspect-[4/3] w-full bg-[#0D0E12] overflow-hidden border-b border-slate-200 dark:border-slate-800/80">
                  {!imgFailed ? (
                    <img
                      src={pkg.imageUrl}
                      alt={`${pkg.title} Free Fire top-up package`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      onError={() => setFailedImages((prev) => ({ ...prev, [pkg.id]: true }))}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#12141D] to-[#1A1325] p-4 sm:p-6 text-center">
                      <Gem className="w-8 h-8 sm:w-10 sm:h-10 text-sky-400 mb-2" />
                      <span className="font-display font-bold text-white text-sm sm:text-lg">
                        {pkg.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col justify-between gap-3 sm:gap-4 min-w-0">
                  <div className="space-y-1.5 sm:space-y-2 min-w-0">
                    {/* Clean Unboxed Metadata Line (Zero-Pill Rule) */}
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                      <span
                        className={
                          pkg.stockStatus === 'out_of_stock'
                            ? 'text-rose-500 font-medium shrink-0'
                            : pkg.stockStatus === 'low_stock'
                            ? 'text-amber-500 font-medium shrink-0'
                            : 'text-emerald-600 dark:text-emerald-400 font-medium shrink-0'
                        }
                      >
                        {stockLabel(pkg.stockStatus)}
                      </span>
                      {pkg.offerLabel && (
                        <>
                          <span aria-hidden="true" className="shrink-0">·</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium truncate">
                            {pkg.offerLabel}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col min-[430px]:flex-row min-[430px]:items-baseline justify-between gap-0.5 sm:gap-2 min-w-0">
                      <h3 className="font-display text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-white truncate">
                        {pkg.title}
                      </h3>
                      {pkg.bonusDiamonds > 0 && (
                        <span className="font-mono-tabular text-[11px] sm:text-xs font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap shrink-0">
                          +{pkg.bonusDiamonds} Bonus
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span className="font-mono-tabular text-base sm:text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPkr(pkg.pricePkr)}
                        </span>
                        {pkg.originalPricePkr && pkg.originalPricePkr > pkg.pricePkr && (
                          <span className="font-mono-tabular text-[11px] sm:text-xs text-slate-400 line-through whitespace-nowrap">
                            {formatPkr(pkg.originalPricePkr)}
                          </span>
                        )}
                      </div>
                      {pkg.discountPercent && pkg.discountPercent > 0 ? (
                        <p className="font-mono-tabular text-[11px] sm:text-xs text-rose-600 dark:text-rose-400 font-medium">
                          Save {pkg.discountPercent}%
                        </p>
                      ) : (
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                          Direct UID credit
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isOut}
                      onClick={() => onSelectPackage(pkg)}
                      className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      {isOut ? 'Sold Out' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Special Offer Promotional Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-[#12141D] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-5 sm:p-8 flex flex-col justify-center space-y-3.5 sm:space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span>Special Offer · Squad Vault Promotion</span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
            Save PKR 50 on Squad & Mega Vault Packs with Code{' '}
            <span className="font-mono-tabular text-amber-400">MTC10</span>
          </h3>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Applies automatically at checkout on any order of PKR 1,000 or above. Ideal for
            520, 1080, 2200, and 5600 Diamond top-ups via JazzCash or EasyPaisa.
          </p>
          <div className="pt-1 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                const target = packages.find((p) => p.diamonds >= 520 && p.stockStatus !== 'out_of_stock') || packages[0];
                if (target) {
                  onSelectPackage(target, 'MTC10');
                }
              }}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Claim MTC10 on 520 Pack</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText('MTC10').catch(() => {});
                showToast('Promo Code Copied', 'Use code MTC10 during checkout.', 'info');
              }}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 active:scale-[0.98] text-sm font-mono-tabular transition-all cursor-pointer flex items-center justify-center"
            >
              Copy MTC10
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative aspect-[16/9] lg:aspect-auto lg:min-h-[220px] bg-[#090A0F]">
          {!promoBannerFailed ? (
            <img
              src={PROMO_CRATE_IMAGE}
              alt="Black and gold Free Fire diamond supply crate"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onError={() => setPromoBannerFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#12141D] to-[#20131C] p-8">
              <Gem className="w-14 h-14 text-amber-400" />
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#12141D] via-transparent to-transparent hidden lg:block"
          />
        </div>
      </div>
    </section>
  );
};
