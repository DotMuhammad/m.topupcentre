import React from 'react';
import { CheckCircle2, CreditCard, Shield, Zap } from 'lucide-react';
import { useTopup } from '../store/TopupContext';
import { TRANSLATIONS } from '../data/seedData';

export const HowAndWhySection: React.FC = () => {
  const { lang } = useTopup();
  const t = TRANSLATIONS[lang];

  const steps = [
    {
      num: '01.',
      title: 'Verify Your Player ID',
      desc: 'Enter your 8–12 digit Free Fire UID and select your region. Confirm your live in-game nickname before paying.',
    },
    {
      num: '02.',
      title: 'Choose Diamond Pack & Pay in PKR',
      desc: 'Select from 25 to 5,600 Diamonds and pay securely with JazzCash, EasyPaisa, SadaPay, or Visa/Mastercard.',
    },
    {
      num: '03.',
      title: 'Receive Diamonds & Automated Receipt',
      desc: 'Diamonds are queued directly to your Player UID and an instant receipt with live order tracking is issued.',
    },
  ];

  const pillars = [
    {
      icon: Zap,
      title: 'Fast Local Processing',
      desc: 'Orders placed via JazzCash and EasyPaisa enter our instant verification desk with typical completion in 1–3 minutes.',
    },
    {
      icon: Shield,
      title: 'Zero Password Required',
      desc: 'We never ask for your Garena, Facebook, or Google login credentials. Only your public Free Fire UID is needed.',
    },
    {
      icon: CreditCard,
      title: 'Transparent PKR Pricing',
      desc: 'Clear Pakistani Rupee pricing with live promo code discounts and downloadable transaction receipts.',
    },
    {
      icon: CheckCircle2,
      title: 'Real-Time Order Tracking',
      desc: 'Follow every order from Payment Verified through UID Queued to Completed inside your Transaction History.',
    },
  ];

  return (
    <section
      id="how-to-topup"
      className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0D0F16]"
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 space-y-10 sm:space-y-14">
        {/* How to Top Up */}
        <div className="space-y-6 sm:space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.howHeading}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Designed after official direct-UID top-up desks so your account stays safe and every
              PKR transaction is documented.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pt-2 border-t border-slate-200 dark:border-slate-800">
            {steps.map((step) => (
              <div key={step.num} className="pt-4 sm:pt-6 space-y-2">
                <span className="font-mono-tabular text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {step.num}
                </span>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="space-y-6 sm:space-y-8 pt-8 sm:pt-10 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-2xl space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.whyHeading}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {pillars.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
