import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileText, Search, Star, Truck } from 'lucide-react';
import { useTopup } from '../store/TopupContext';
import { Order, OrderStatus } from '../types';
import { formatDateTime, formatPkr } from '../utils/exportCsv';

export const OrderTrackingView: React.FC = () => {
  const { orders, submitReview, setView } = useTopup();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.playerUid.toLowerCase().includes(q) ||
        o.playerNickname.toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  const statusMeta = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed · Credited', cls: 'text-emerald-600 dark:text-emerald-400', step: 3 };
      case 'processing':
        return { label: 'Processing UID Queue', cls: 'text-amber-600 dark:text-amber-400', step: 2 };
      case 'cancelled':
        return { label: 'Cancelled', cls: 'text-rose-600 dark:text-rose-400', step: 0 };
      default:
        return { label: 'Pending Verification', cls: 'text-sky-600 dark:text-sky-400', step: 1 };
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Transaction History & Live Order Tracking
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Monitor diamond dispatch progress, inspect automated email receipts, and rate completed
            top-ups.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setView('store')}
          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center transition-all"
        >
          New Top-Up
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 sm:max-w-md min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Order ID or Player UID..."
            aria-label="Search orders"
            className="w-full min-h-[44px] h-11 pl-10 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#12141D] text-base sm:text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none pb-0.5">
          {(['all', 'pending', 'processing', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium capitalize whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-[#12141D] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12141D] p-8 sm:p-12 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            No matching orders found
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Place a diamond top-up or clear your search filter to view transaction history.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const meta = statusMeta(order.status);
            return (
              <article
                key={order.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-4 min-w-0"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                        {order.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDateTime(order.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${meta.cls}`}>{meta.label}</span>
                      {order.offlineQueued && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-500">Queued Offline</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {order.packageTitle}
                      {order.bonusDiamonds > 0 ? ` (+${order.bonusDiamonds} Bonus)` : ''}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-mono-tabular break-words">
                      Player: {order.playerNickname} · UID {order.playerUid} ({order.playerRegion}) ·{' '}
                      {order.paymentMethod.toUpperCase()} ({order.transactionRef})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono-tabular text-lg font-bold text-slate-900 dark:text-white md:mr-2">
                      {formatPkr(order.amountPkr)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(order)}
                        className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>

                      {order.status === 'completed' && !order.reviewed && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingOrder(order);
                            setRating(5);
                            setComment('');
                          }}
                          className="min-h-[42px] px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Rate Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Real-time 3-step Dispatch Progress */}
                {order.status !== 'cancelled' && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>1. Payment Logged</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 font-medium ${
                        meta.step >= 2
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>2. UID Queued</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 font-medium ${
                        meta.step >= 3
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      <Truck className="w-4 h-4 shrink-0" />
                      <span>3. Diamonds Credited</span>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Email Receipt Viewer Modal */}
      {selectedReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-display font-bold text-slate-900 dark:text-white truncate">
                Email Receipt · {selectedReceipt.id}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="min-h-[40px] px-3 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 break-all">
                Dispatched to: <span className="font-medium">{selectedReceipt.customerEmail}</span>
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 text-xs sm:text-sm">
                <span className="text-slate-500">Player</span>
                <span className="text-right font-medium text-slate-900 dark:text-white break-words">
                  {selectedReceipt.playerNickname} ({selectedReceipt.playerUid})
                </span>
                <span className="text-slate-500">Package</span>
                <span className="text-right font-mono-tabular text-slate-900 dark:text-white">
                  {selectedReceipt.packageTitle}
                </span>
                <span className="text-slate-500">Gateway</span>
                <span className="text-right uppercase text-slate-900 dark:text-white break-all">
                  {selectedReceipt.paymentMethod} · {selectedReceipt.transactionRef}
                </span>
                <span className="text-slate-500 font-semibold">Amount Paid</span>
                <span className="text-right font-mono-tabular font-bold text-slate-900 dark:text-white">
                  {formatPkr(selectedReceipt.amountPkr)}
                </span>
              </div>
            </div>
            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Review Modal */}
      {reviewingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              submitReview({
                orderId: reviewingOrder.id,
                playerName: reviewingOrder.playerNickname,
                playerUid: reviewingOrder.playerUid,
                rating,
                comment,
                packagePurchased: reviewingOrder.packageTitle,
              });
              setReviewingOrder(null);
            }}
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto"
          >
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Rate Order {reviewingOrder.id}
            </h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  aria-label={`Rate ${s} stars`}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was your top-up delivery experience?"
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingOrder(null)}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
