import React, { useMemo, useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { useTopup } from '../store/TopupContext';
import { FAQS, TRANSLATIONS } from '../data/seedData';
import { formatDateTime } from '../utils/exportCsv';

export const ReviewsAndFaq: React.FC = () => {
  const { reviews, orders, submitReview, lang, playerProfile } = useTopup();
  const t = TRANSLATIONS[lang];

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const [reviewName, setReviewName] = useState(playerProfile?.nickname || '');
  const [reviewUid, setReviewUid] = useState(playerProfile?.uid || '');
  const [reviewPkg, setReviewPkg] = useState('520 Diamonds');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === 'completed' && !o.reviewed),
    [orders]
  );

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      setReviewError('Please enter your name and review comment.');
      return;
    }
    setReviewError('');
    submitReview({
      playerName: reviewName,
      playerUid: reviewUid || '2481904312',
      rating: reviewRating,
      comment: reviewComment,
      packagePurchased: reviewPkg,
    });
    setReviewComment('');
    setShowReviewForm(false);
  };

  return (
    <section
      id="reviews-section"
      className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090A0F]"
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 space-y-12 sm:space-y-16">
        {/* Customer Reviews */}
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t.reviewsHeading}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-mono-tabular">
                {avgRating} / 5.0 average across {reviews.length} player reviews
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowReviewForm((prev) => !prev)}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center"
            >
              {showReviewForm ? 'Close Review Form' : 'Write a Review'}
            </button>
          </div>

          {/* Inline Review Submission Form */}
          {showReviewForm && (
            <form
              onSubmit={handleSubmitReview}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12141D] p-4 sm:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Submit Player Rating & Feedback
                </h3>
                {completedOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const o = completedOrders[0];
                      setReviewName(o.playerNickname);
                      setReviewUid(o.playerUid);
                      setReviewPkg(o.packageTitle);
                    }}
                    className="min-h-[36px] text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer text-left"
                  >
                    Fill from latest completed order ({completedOrders[0].id})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Player Name / Nickname"
                  aria-label="Player Name or Nickname"
                  className="min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={reviewUid}
                  onChange={(e) => setReviewUid(e.target.value)}
                  placeholder="Free Fire UID (optional)"
                  aria-label="Free Fire UID"
                  className="min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                />
                <select
                  value={reviewPkg}
                  onChange={(e) => setReviewPkg(e.target.value)}
                  aria-label="Diamond Package Purchased"
                  className="min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white"
                >
                  <option value="25 Diamonds">25 Diamonds</option>
                  <option value="100 Diamonds">100 Diamonds</option>
                  <option value="210 Diamonds">210 Diamonds</option>
                  <option value="520 Diamonds">520 Diamonds</option>
                  <option value="1080 Diamonds">1080 Diamonds</option>
                  <option value="2200 Diamonds">2200 Diamonds</option>
                  <option value="5600 Diamonds">5600 Diamonds</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-slate-600 dark:text-slate-400 mr-2">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    aria-label={`Rate ${star} stars`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= reviewRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share how fast your diamonds arrived and which payment method you used..."
                aria-label="Review comment"
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white"
              />

              {reviewError && <p className="text-xs text-rose-500">{reviewError}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer"
                >
                  Publish Review
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {reviews.slice(0, 6).map((rev) => (
              <article
                key={rev.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#12141D] p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5" aria-label={`${rev.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-4 h-4 ${
                            idx < rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                      Verified Order
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-0.5 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{rev.playerName}</p>
                  <p className="font-mono-tabular break-words">
                    {rev.playerUidMasked} · {rev.packagePurchased} · {formatDateTime(rev.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="pt-10 sm:pt-12 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <div className="lg:col-span-4 space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.faqHeading}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Everything you need to know about Player ID verification, PKR payments, and instant
              diamond receipts.
            </p>
          </div>

          <div className="lg:col-span-8 divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full min-h-[52px] py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <span className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
