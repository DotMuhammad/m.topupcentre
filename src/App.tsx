import React, { Suspense, lazy, useState } from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { TopupProvider, useTopup } from './store/TopupContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { DiamondStore } from './components/DiamondStore';
import { HowAndWhySection } from './components/HowAndWhySection';
import { ReviewsAndFaq } from './components/ReviewsAndFaq';
import { Footer } from './components/Footer';
import { DiamondPackage } from './types';

const CheckoutModal = lazy(() =>
  import('./components/CheckoutModal').then((m) => ({ default: m.CheckoutModal }))
);
const OrderTrackingView = lazy(() =>
  import('./components/OrderTrackingView').then((m) => ({ default: m.OrderTrackingView }))
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const NotificationsDrawer = lazy(() =>
  import('./components/NotificationsDrawer').then((m) => ({ default: m.NotificationsDrawer }))
);

const ViewSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
    <div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-slate-800" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D]"
        />
      ))}
    </div>
    <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D]" />
  </div>
);

const TopupShell: React.FC = () => {
  const { view, toastMessage, dismissToast } = useTopup();
  const [checkoutPkg, setCheckoutPkg] = useState<DiamondPackage | null>(null);
  const [checkoutPromo, setCheckoutPromo] = useState<string | undefined>(undefined);
  const [authOpen, setAuthOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSelectPackage = (pkg: DiamondPackage, prefillPromo?: string) => {
    setCheckoutPkg(pkg);
    setCheckoutPromo(prefillPromo);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090A0F] text-slate-900 dark:text-slate-100">
      <Navbar onOpenAuth={() => setAuthOpen(true)} />

      <main className="flex-1">
        {view === 'store' && (
          <>
            <HeroSection />
            <DiamondStore
              onSelectPackage={handleSelectPackage}
              onOpenNotifications={() => setNotificationsOpen(true)}
            />
            <HowAndWhySection />
            <ReviewsAndFaq />
          </>
        )}

        {view === 'orders' && (
          <Suspense fallback={<ViewSkeleton />}>
            <OrderTrackingView />
          </Suspense>
        )}

        {view === 'admin' && (
          <Suspense fallback={<ViewSkeleton />}>
            <AdminDashboard />
          </Suspense>
        )}
      </main>

      <Footer />

      {/* Lazy-Loaded Modals & Drawers */}
      <Suspense fallback={null}>
        {checkoutPkg && (
          <CheckoutModal
            pkg={checkoutPkg}
            initialPromo={checkoutPromo}
            onClose={() => {
              setCheckoutPkg(null);
              setCheckoutPromo(undefined);
            }}
          />
        )}
        {authOpen && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />}
        {notificationsOpen && (
          <NotificationsDrawer
            open={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        )}
      </Suspense>

      {/* Mobile-Safe Floating Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 z-50 sm:w-full sm:max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] shadow-xl p-3.5 sm:p-4 flex items-start gap-3"
        >
          {toastMessage.tone === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          ) : toastMessage.tone === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white break-words">
              {toastMessage.title}
            </p>
            {toastMessage.detail && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
                {toastMessage.detail}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss alert"
            className="min-w-[44px] min-h-[44px] -my-2 -mr-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <TopupProvider>
        <TopupShell />
      </TopupProvider>
    </MotionConfig>
  );
}
