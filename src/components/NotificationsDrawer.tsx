import React, { useEffect } from 'react';
import { Bell, CheckCheck, Tag, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useTopup } from '../store/TopupContext';
import { formatDateTime } from '../utils/exportCsv';

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ open, onClose }) => {
  const { notifications, markAllNotificationsRead } = useTopup();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Order and Promotional Notifications"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md h-full bg-white dark:bg-[#12141D] border-l border-slate-200 dark:border-slate-800 flex flex-col"
      >
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-rose-500 shrink-0" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
              Order & Promo Alerts
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="min-h-[40px] px-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark read</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-200 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 space-y-1.5 ${
                  !n.read ? 'bg-rose-500/5 dark:bg-rose-500/10' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                    {n.type === 'promo' && <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    {n.title}
                  </span>
                  <span className="font-mono-tabular text-slate-400">
                    {formatDateTime(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {n.message}
                </p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
