import React from 'react';
import { Mail, MessageSquare, ShieldCheck } from 'lucide-react';
import { useTopup } from '../store/TopupContext';

export const Footer: React.FC = () => {
  const { setView } = useTopup();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-[#06070B]">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="sm:col-span-2 space-y-3 min-w-0">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Muhammad Topup Centre
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              Independent Free Fire Diamond Top-Up platform built for Pakistani gamers. Verified
              Player UID lookup, local PKR pricing, and instant order receipts.
            </p>
            <div className="flex items-start sm:items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
              <span>JazzCash · EasyPaisa · SadaPay · Visa / Mastercard</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-1">Quick Links</h3>
            <ul className="space-y-0.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setView('store');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="min-h-[40px] py-1.5 inline-flex items-center hover:text-rose-500 transition-colors cursor-pointer"
                >
                  Diamond Store
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setView('orders');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="min-h-[40px] py-1.5 inline-flex items-center hover:text-rose-500 transition-colors cursor-pointer"
                >
                  Track Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setView('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="min-h-[40px] py-1.5 inline-flex items-center hover:text-rose-500 transition-colors cursor-pointer"
                >
                  Admin Console
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Support Desk</h3>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2 min-w-0">
                <MessageSquare className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-mono-tabular">+92 300 8491200</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="break-all">support@muhammadtopup.pk</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Muhammad Topup Centre. All rights reserved.</p>
          <p>All package prices are listed in Pakistani Rupees (PKR).</p>
        </div>
      </div>
    </footer>
  );
};
