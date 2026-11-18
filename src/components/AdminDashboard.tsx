import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Loader2,
  Menu,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTopup } from '../store/TopupContext';
import { DiamondPackage, OrderStatus, StockStatus, UidDiagnosticReport } from '../types';
import { TIER1_IMAGE, TIER2_IMAGE, TIER3_IMAGE } from '../data/seedData';
import { exportOrdersCsv, exportPackagesCsv, formatDateTime, formatPkr } from '../utils/exportCsv';
import { PlayerProfileCard } from './PlayerProfileCard';
import { useUIDLookup } from '../hooks/useUIDLookup';

type AdminTab = 'orders' | 'uid' | 'packages' | 'reports';

export const AdminDashboard: React.FC = () => {
  const {
    orders,
    packages,
    uidApiStatus,
    uidLogs,
    recordUidLog,
    clearUidLogs,
    lookupPlayerByUid,
    updateOrderStatus,
    updatePackage,
    addPackage,
    deletePackage,
    resetPackagesToDefault,
    showToast,
  } = useTopup();

  const [tab, setTab] = useState<AdminTab>('orders');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);

  // Backend Diagnostic Runner state
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagReport, setDiagReport] = useState<UidDiagnosticReport | null>(null);

  // Admin UID Lookup Console state powered by useUIDLookup hook
  const [adminUidInput, setAdminUidInput] = useState('');
  const [adminRegion, setAdminRegion] = useState('PK');
  const {
    loading: adminLookingUp,
    player: adminLookupPlayer,
    error: adminLookupError,
    diagnostic: adminLookupDiag,
    lookup: adminLookup,
  } = useUIDLookup({
    onResult: (result) => {
      if (result.code === 'ABORTED') return;
      if (result.player) {
        recordUidLog({
          uid: result.player.uid,
          region: result.player.region || result.sanitizedRegion,
          status: 'found',
          nickname: result.player.nickname,
          message: `Verified ${result.player.nickname}`,
        });
      } else {
        recordUidLog({
          uid: result.sanitizedUid || '(empty)',
          region: result.sanitizedRegion,
          status:
            result.code === 'UID_NOT_FOUND' || result.code === 'HTTP_404' ? 'not_found' : 'error',
          message: result.error || 'Lookup failed',
        });
      }
    },
  });

  const [newDiamonds, setNewDiamonds] = useState('400');
  const [newBonus, setNewBonus] = useState('40');
  const [newPrice, setNewPrice] = useState('790');
  const [newOffer, setNewOffer] = useState('Custom Bundle');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== 'cancelled');
    const revenuePkr = activeOrders.reduce((acc, o) => acc + o.amountPkr, 0);
    const totalDiamonds = activeOrders.reduce((acc, o) => acc + o.diamonds + o.bonusDiamonds, 0);
    const pendingCount = orders.filter(
      (o) => o.status === 'pending' || o.status === 'processing'
    ).length;
    const completedCount = orders.filter((o) => o.status === 'completed').length;

    const gatewayTotals = {
      jazzcash: 0,
      easypaisa: 0,
      wallet: 0,
      card: 0,
    };
    activeOrders.forEach((o) => {
      gatewayTotals[o.paymentMethod] += o.amountPkr;
    });

    const maxGateway = Math.max(
      1,
      gatewayTotals.jazzcash,
      gatewayTotals.easypaisa,
      gatewayTotals.wallet,
      gatewayTotals.card
    );

    return {
      revenuePkr,
      totalDiamonds,
      pendingCount,
      completedCount,
      gatewayTotals,
      maxGateway,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderFilter !== 'all' && o.status !== orderFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.playerUid.toLowerCase().includes(q) ||
        o.playerNickname.toLowerCase().includes(q) ||
        o.transactionRef.toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearch, orderFilter]);

  const lowStockPackages = useMemo(
    () => packages.filter((p) => p.stockStatus !== 'in_stock'),
    [packages]
  );

  const uniqueCustomers = useMemo(
    () => Array.from(new Map(orders.map((o) => [o.playerUid, o])).values()),
    [orders]
  );

  const navItems: {
    id: AdminTab;
    label: string;
    shortLabel: string;
    count?: number;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'orders',
      label: 'Order Queue',
      shortLabel: 'Orders',
      count: orders.length,
      icon: ClipboardList,
    },
    {
      id: 'uid',
      label: 'UID Lookup & Logs',
      shortLabel: 'UID API',
      count: uidLogs.length,
      icon: ShieldCheck,
    },
    {
      id: 'packages',
      label: 'Package & Price Editor',
      shortLabel: 'Packages',
      count: packages.length,
      icon: Package,
    },
    {
      id: 'reports',
      label: 'Customers & Backups',
      shortLabel: 'Customers',
      count: uniqueCustomers.length,
      icon: Users,
    },
  ];

  const handleSelectTab = (next: AdminTab) => {
    setTab(next);
    setDrawerOpen(false);
  };

  const handleAdminUidLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminLookup(adminUidInput, adminRegion);
  };

  const handleRunDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const params = new URLSearchParams({
        probe: 'true',
        region: adminRegion,
      });
      if (adminUidInput.trim()) {
        params.set('uid', adminUidInput.trim());
      }
      const res = await fetch(`/api/uid-diagnostics?${params.toString()}`);
      const json = (await res.json()) as UidDiagnosticReport;
      setDiagReport(json);
    } catch {
      setDiagReport({
        ok: false,
        uidApiConfigured: false,
        providerHost: null,
        method: 'GET',
        uidParam: 'uid',
        regionParam: 'region',
        hasApiKey: false,
        hasApiHost: false,
        regionMapping: {},
        probe: {
          attempted: true,
          reachable: false,
          errorCode: 'NETWORK_ERROR',
          message: 'Unable to reach /api/uid-diagnostics on the backend server.',
        },
      });
    } finally {
      setDiagLoading(false);
    }
  };

  const handleVerifyOrderUid = async (orderId: string, uid: string, region: string) => {
    setVerifyingOrderId(orderId);
    const res = await lookupPlayerByUid(uid, region, { saveAsActivePlayer: false });
    setVerifyingOrderId(null);
    if (res.player) {
      showToast(
        `Order ${orderId} UID Verified`,
        `${res.player.nickname} (${res.player.uid}) confirmed via live API.`,
        'success'
      );
    } else {
      showToast(`Order ${orderId} UID Check`, res.error || 'Lookup failed.', 'error');
    }
  };

  const handleAddPackage = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(newDiamonds);
    const b = Number(newBonus) || 0;
    const p = Number(newPrice);
    if (!d || d <= 0 || !p || p <= 0) return;

    const cat: DiamondPackage['category'] = d <= 100 ? 'starter' : d <= 600 ? 'popular' : 'mega';
    const img = d <= 100 ? TIER1_IMAGE : d <= 600 ? TIER2_IMAGE : TIER3_IMAGE;

    addPackage({
      diamonds: d,
      bonusDiamonds: b,
      title: `${d} Diamonds`,
      category: cat,
      pricePkr: p,
      offerLabel: newOffer.trim() || undefined,
      imageUrl: img,
      stockStatus: 'in_stock',
    });
    setShowAddForm(false);
  };

  const activeNav = navItems.find((item) => item.id === tab) || navItems[0];

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Admin Console · Store Operations
          </p>
          <h1 className="font-display text-xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight break-words">
            Muhammad Topup Centre Management
          </h1>
        </div>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              exportOrdersCsv(orders);
              showToast('Orders CSV Downloaded', `${orders.length} order rows exported.`, 'success');
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#12141D] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export Orders CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              exportPackagesCsv(packages);
              showToast(
                'Inventory CSV Downloaded',
                `${packages.length} diamond packages exported.`,
                'success'
              );
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-amber-400 hover:opacity-90 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export Inventory CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">Gross Revenue</p>
          <p className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
            {formatPkr(metrics.revenuePkr)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono-tabular">
            {metrics.completedCount} completed orders
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">Diamonds Queued / Sent</p>
          <p className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
            {metrics.totalDiamonds.toLocaleString('en-PK')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Includes bonus diamonds</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pending Queue</p>
          <p className="font-mono-tabular text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.pendingCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Awaiting UID dispatch</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">Stock Alerts</p>
          <p className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {lowStockPackages.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {packages.length} active packages
          </p>
        </div>
      </div>

      {/* Real Gateway Sales Breakdown */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Sales Volume by Payment Gateway (PKR)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(
            [
              { key: 'jazzcash', label: 'JazzCash' },
              { key: 'easypaisa', label: 'EasyPaisa' },
              { key: 'wallet', label: 'SadaPay / NayaPay' },
              { key: 'card', label: 'Visa / Mastercard' },
            ] as const
          ).map((gw) => {
            const val = metrics.gatewayTotals[gw.key];
            const pct = Math.round((val / metrics.maxGateway) * 100);
            return (
              <div key={gw.key} className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {gw.label}
                  </span>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white shrink-0">
                    {formatPkr(val)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(val > 0 ? 6 : 0, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Responsive Admin Workspace: Sidebar on Desktop, Drawer + Quick Bar on Mobile */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Desktop Sidebar Rail */}
        <aside
          aria-label="Admin sections"
          className="hidden lg:block w-60 shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-3 space-y-1 sticky top-20"
        >
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Admin Sections
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="inline-flex items-center gap-2.5 min-w-0 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.shortLabel}</span>
                </span>
                {item.count !== undefined && (
                  <span
                    className={`text-xs font-mono-tabular px-1.5 py-0.5 rounded ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Mobile/Tablet Section Trigger & Horizontal Switcher */}
        <div className="w-full lg:hidden space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <activeNav.icon className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {activeNav.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              className="min-h-[44px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  tab === item.id
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-[#12141D] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.shortLabel} ({item.count ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Slide-Out Admin Drawer */}
        <AnimatePresence>
          {drawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex justify-start" role="dialog" aria-modal="true" aria-label="Admin sections drawer">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="relative z-10 w-[84vw] max-w-xs h-full bg-white dark:bg-[#12141D] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Admin Navigation
                    </p>
                    <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Muhammad Topup
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close admin menu"
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1.5 flex-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between gap-2 cursor-pointer ${
                          active
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </span>
                        <span
                          className={`text-xs font-mono-tabular px-1.5 py-0.5 rounded ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {item.count ?? 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Active Tab Content */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* TAB 1: ORDERS QUEUE */}
          {tab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Filter by Order ID, UID, or Ref..."
                    className="w-full min-h-[44px] pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#12141D] text-base sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {(['all', 'pending', 'processing', 'completed', 'cancelled'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderFilter(st)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                          orderFilter === st
                            ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950'
                            : 'bg-slate-100 dark:bg-[#12141D] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Mobile Card List (below md) */}
              <div className="md:hidden space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-8 text-center text-sm text-slate-500">
                    No matching orders in queue.
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-white">
                              {order.id}
                            </span>
                            <span
                              className={`text-xs font-semibold capitalize ${
                                order.status === 'completed'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : order.status === 'processing'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : order.status === 'cancelled'
                                  ? 'text-rose-500'
                                  : 'text-sky-600 dark:text-sky-400'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs font-mono-tabular text-slate-500 mt-0.5">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <span className="font-mono-tabular text-base font-bold text-slate-900 dark:text-white shrink-0">
                          {formatPkr(order.amountPkr)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 text-xs">
                        <div className="min-w-0">
                          <p className="text-slate-500">Player & UID</p>
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {order.playerNickname}
                          </p>
                          <p className="font-mono-tabular text-slate-500 truncate">
                            {order.playerUid} ({order.playerRegion})
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-500">Package & Gateway</p>
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {order.packageTitle}
                            {order.bonusDiamonds > 0 ? ` (+${order.bonusDiamonds})` : ''}
                          </p>
                          <p className="uppercase font-mono-tabular text-slate-500 truncate">
                            {order.paymentMethod} · {order.transactionRef}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={verifyingOrderId === order.id}
                          onClick={() =>
                            handleVerifyOrderUid(order.id, order.playerUid, order.playerRegion)
                          }
                          className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                          {verifyingOrderId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Verify UID</span>
                        </button>

                        {order.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="min-h-[44px] px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </button>
                        )}

                        {order.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Process</span>
                          </button>
                        )}

                        {order.status !== 'cancelled' && order.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            className="min-h-[44px] px-3 py-2 rounded-lg border border-rose-500/30 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* Desktop Table (md and above) */}
              <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[780px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 font-semibold">Order</th>
                      <th className="py-3 px-4 font-semibold">Player UID</th>
                      <th className="py-3 px-4 font-semibold">Package</th>
                      <th className="py-3 px-4 font-semibold">Payment</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-sm">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <p className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                            {order.id}
                          </p>
                          <p className="text-xs text-slate-500 font-mono-tabular">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {order.playerNickname}
                          </p>
                          <p className="text-xs font-mono-tabular text-slate-500">
                            {order.playerUid} ({order.playerRegion})
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-800 dark:text-slate-200">
                          {order.packageTitle}
                          {order.bonusDiamonds > 0 ? ` (+${order.bonusDiamonds})` : ''}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <p className="uppercase font-semibold text-slate-800 dark:text-slate-200">
                            {order.paymentMethod}
                          </p>
                          <p className="font-mono-tabular text-slate-500">{order.transactionRef}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-900 dark:text-white">
                          {formatPkr(order.amountPkr)}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold capitalize">
                          <span
                            className={
                              order.status === 'completed'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : order.status === 'processing'
                                ? 'text-amber-600 dark:text-amber-400'
                                : order.status === 'cancelled'
                                ? 'text-rose-500'
                                : 'text-sky-600 dark:text-sky-400'
                            }
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={verifyingOrderId === order.id}
                              onClick={() =>
                                handleVerifyOrderUid(order.id, order.playerUid, order.playerRegion)
                              }
                              title="Verify UID via Live API"
                              className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                            >
                              {verifyingOrderId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                              <span>Verify UID</span>
                            </button>
                            {order.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(order.id, 'completed')}
                                title="Complete & Credit Diamonds"
                                className="px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Complete</span>
                              </button>
                            )}
                            {order.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(order.id, 'processing')}
                                title="Mark Processing"
                                className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Process</span>
                              </button>
                            )}
                            {order.status !== 'cancelled' && order.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                title="Cancel Order"
                                className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ADMIN UID LOOKUP, DIAGNOSTICS & VERIFICATION LOGS */}
          {tab === 'uid' && (
            <div className="space-y-5 sm:space-y-6">
              {/* Server API Integration & Diagnostic Panel */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        Server Free Fire UID Lookup & Diagnostics
                      </h2>
                      <span
                        className={`text-xs font-semibold ${
                          uidApiStatus.uidApiConfigured
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {uidApiStatus.uidApiConfigured ? 'API Configured' : 'API Not Configured'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 break-words">
                      {uidApiStatus.uidApiConfigured
                        ? `Server proxy (/api/freefire/lookup) connected to ${uidApiStatus.providerHost || 'authorized provider'} (${uidApiStatus.method || 'GET'}). Pakistan (PK) maps to ${uidApiStatus.regionMapping?.PK || 'PK'}.`
                        : 'Set FREEFIRE_API_URL (and FREEFIRE_API_KEY / FREEFIRE_API_HEADER / FREEFIRE_REGION_MAP if required) in server environment variables to enable live lookups.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={diagLoading}
                    onClick={handleRunDiagnostics}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {diagLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span>Run Live Diagnostic</span>
                  </button>
                </div>

                {diagReport && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090A0F] p-4 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`font-semibold break-words ${
                          diagReport.ok
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {diagReport.probe?.message ||
                          (diagReport.uidApiConfigured
                            ? 'Backend API ready'
                            : 'Backend API missing FREEFIRE_API_URL')}
                      </span>
                      {diagReport.probe?.latencyMs !== undefined && (
                        <span className="font-mono-tabular text-slate-500">
                          {diagReport.probe.latencyMs}ms · HTTP {diagReport.probe.httpStatus ?? 'N/A'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono-tabular text-slate-600 dark:text-slate-300">
                      <span className="truncate">Host: {diagReport.providerHost || 'None'}</span>
                      <span>Method: {diagReport.method}</span>
                      <span>PK Map: {diagReport.regionMapping?.PK || 'PK'}</span>
                      <span>Auth Key: {diagReport.hasApiKey ? 'Present' : 'Not Set'}</span>
                    </div>
                    {diagReport.probe?.topLevelKeys && diagReport.probe.topLevelKeys.length > 0 && (
                      <p className="font-mono-tabular text-slate-500 dark:text-slate-400 break-words">
                        Detected JSON keys: {diagReport.probe.topLevelKeys.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Live Admin UID Inspector */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-5 space-y-4">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Live UID Inspector
                </h3>

                <form onSubmit={handleAdminUidLookup} className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={adminUidInput}
                    onChange={(e) => setAdminUidInput(e.target.value)}
                    placeholder="Enter Free Fire UID to inspect..."
                    className="flex-1 min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                  <select
                    value={adminRegion}
                    onChange={(e) => setAdminRegion(e.target.value)}
                    className="min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white"
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
                    disabled={adminLookingUp}
                    className="w-full sm:w-auto min-h-[44px] px-5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {adminLookingUp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Querying API...</span>
                      </>
                    ) : (
                      <span>Lookup UID</span>
                    )}
                  </button>
                </form>

                {adminLookupError && (
                  <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 space-y-1 text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="break-words">{adminLookupError}</span>
                    </div>
                    {adminLookupDiag?.httpStatus && (
                      <p className="font-mono-tabular text-xs pl-6 text-rose-500/80">
                        HTTP {adminLookupDiag.httpStatus} · Mapped Region:{' '}
                        {adminLookupDiag.mappedRegion || adminRegion}
                        {adminLookupDiag.latencyMs !== undefined
                          ? ` · ${adminLookupDiag.latencyMs}ms`
                          : ''}
                      </p>
                    )}
                  </div>
                )}

                {adminLookupPlayer && (
                  <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090A0F] space-y-2">
                    <PlayerProfileCard profile={adminLookupPlayer} />
                    {adminLookupDiag && (
                      <p className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                        HTTP {adminLookupDiag.httpStatus ?? 200} · Mapped Region:{' '}
                        {adminLookupDiag.mappedRegion || adminRegion}
                        {adminLookupDiag.latencyMs !== undefined
                          ? ` · ${adminLookupDiag.latencyMs}ms`
                          : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* UID Lookup Audit Log */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    UID Verification Audit Log
                  </h3>
                  {uidLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={clearUidLogs}
                      className="min-h-[36px] px-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                {uidLogs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No UID lookup queries recorded yet. Enter a UID above or in the storefront hero
                    to test live lookup logging.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card List (below md) */}
                    <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                      {uidLogs.map((log) => (
                        <div key={log.id} className="p-4 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono-tabular font-bold text-sm text-slate-900 dark:text-white">
                              {log.uid} ({log.region})
                            </span>
                            <span
                              className={`font-semibold ${
                                log.status === 'found'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : log.status === 'not_found'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-500'
                              }`}
                            >
                              {log.status === 'found'
                                ? 'Verified'
                                : log.status === 'not_found'
                                ? 'Not Found'
                                : 'API Error'}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 break-words">
                            {log.nickname ? `${log.nickname} · ${log.message}` : log.message}
                          </p>
                          <p className="font-mono-tabular text-[11px] text-slate-400">
                            {formatDateTime(log.checkedAt)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (md and above) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[640px]">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                            <th className="py-3 px-4 font-semibold">Timestamp</th>
                            <th className="py-3 px-4 font-semibold">UID</th>
                            <th className="py-3 px-4 font-semibold">Region</th>
                            <th className="py-3 px-4 font-semibold">Outcome</th>
                            <th className="py-3 px-4 font-semibold">Result / Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs sm:text-sm">
                          {uidLogs.map((log) => (
                            <tr key={log.id}>
                              <td className="py-3 px-4 font-mono-tabular text-slate-500 dark:text-slate-400">
                                {formatDateTime(log.checkedAt)}
                              </td>
                              <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900 dark:text-white">
                                {log.uid}
                              </td>
                              <td className="py-3 px-4 font-mono-tabular text-slate-600 dark:text-slate-300">
                                {log.region}
                              </td>
                              <td className="py-3 px-4 font-semibold">
                                <span
                                  className={
                                    log.status === 'found'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : log.status === 'not_found'
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-rose-500'
                                  }
                                >
                                  {log.status === 'found'
                                    ? 'Verified'
                                    : log.status === 'not_found'
                                    ? 'Not Found'
                                    : 'API Error'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                {log.nickname ? `${log.nickname} · ${log.message}` : log.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EDITABLE PACKAGES & PRICES */}
          {tab === 'packages' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Edit PKR prices, bonus diamonds, offer labels, and stock availability live. Changes
                  persist automatically and update the storefront immediately.
                </p>
                <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={resetPackagesToDefault}
                    className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>Reset Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm((prev) => !prev)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Add Package</span>
                  </button>
                </div>
              </div>

              {showAddForm && (
                <form
                  onSubmit={handleAddPackage}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12141D] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
                >
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Diamonds</label>
                    <input
                      type="number"
                      min={1}
                      value={newDiamonds}
                      onChange={(e) => setNewDiamonds(e.target.value)}
                      className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bonus</label>
                    <input
                      type="number"
                      min={0}
                      value={newBonus}
                      onChange={(e) => setNewBonus(e.target.value)}
                      className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Price (PKR)</label>
                    <input
                      type="number"
                      min={1}
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Offer Label</label>
                    <input
                      type="text"
                      value={newOffer}
                      onChange={(e) => setNewOffer(e.target.value)}
                      className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090A0F] text-base sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="sm:col-span-2 lg:col-span-1 min-h-[44px] px-4 rounded-lg bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
                  >
                    Save Package
                  </button>
                </form>
              )}

              {/* Mobile Package Editor Cards (below md) */}
              <div className="md:hidden space-y-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                      <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {pkg.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => deletePackage(pkg.id)}
                        aria-label={`Delete ${pkg.title}`}
                        className="w-11 h-11 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Price (PKR)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={pkg.pricePkr}
                          onChange={(e) =>
                            updatePackage(pkg.id, { pricePkr: Math.max(1, Number(e.target.value)) })
                          }
                          aria-label={`Price in PKR for ${pkg.title}`}
                          className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] font-mono-tabular text-base text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Compare At (PKR)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={pkg.originalPricePkr ?? ''}
                          placeholder="None"
                          onChange={(e) =>
                            updatePackage(pkg.id, {
                              originalPricePkr: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] font-mono-tabular text-base text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Bonus Diamonds
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={pkg.bonusDiamonds}
                          onChange={(e) =>
                            updatePackage(pkg.id, {
                              bonusDiamonds: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] font-mono-tabular text-base text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Stock Status
                        </label>
                        <select
                          value={pkg.stockStatus}
                          onChange={(e) =>
                            updatePackage(pkg.id, { stockStatus: e.target.value as StockStatus })
                          }
                          className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] text-base text-slate-900 dark:text-white"
                        >
                          <option value="in_stock">In Stock</option>
                          <option value="low_stock">Low Stock</option>
                          <option value="out_of_stock">Out of Stock</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Offer Label
                      </label>
                      <input
                        type="text"
                        value={pkg.offerLabel ?? ''}
                        placeholder="Optional tag"
                        onChange={(e) =>
                          updatePackage(pkg.id, { offerLabel: e.target.value || undefined })
                        }
                        className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] text-base text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Package Table (md and above) */}
              <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[740px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 font-semibold">Package</th>
                      <th className="py-3 px-4 font-semibold">Price (PKR)</th>
                      <th className="py-3 px-4 font-semibold">Compare At (PKR)</th>
                      <th className="py-3 px-4 font-semibold">Bonus Diamonds</th>
                      <th className="py-3 px-4 font-semibold">Offer Label</th>
                      <th className="py-3 px-4 font-semibold">Stock</th>
                      <th className="py-3 px-4 font-semibold text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-sm">
                    {packages.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {pkg.title}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min={1}
                            value={pkg.pricePkr}
                            onChange={(e) =>
                              updatePackage(pkg.id, {
                                pricePkr: Math.max(1, Number(e.target.value)),
                              })
                            }
                            aria-label={`Price in PKR for ${pkg.title}`}
                            className="w-28 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] font-mono-tabular text-sm text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min={0}
                            value={pkg.originalPricePkr ?? ''}
                            placeholder="None"
                            onChange={(e) =>
                              updatePackage(pkg.id, {
                                originalPricePkr: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-28 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] font-mono-tabular text-sm text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min={0}
                            value={pkg.bonusDiamonds}
                            onChange={(e) =>
                              updatePackage(pkg.id, {
                                bonusDiamonds: Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-24 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] font-mono-tabular text-sm text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={pkg.offerLabel ?? ''}
                            placeholder="Optional tag"
                            onChange={(e) =>
                              updatePackage(pkg.id, { offerLabel: e.target.value || undefined })
                            }
                            className="w-36 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] text-sm text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={pkg.stockStatus}
                            onChange={(e) =>
                              updatePackage(pkg.id, { stockStatus: e.target.value as StockStatus })
                            }
                            className="h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090A0F] text-xs text-slate-900 dark:text-white"
                          >
                            <option value="in_stock">In Stock</option>
                            <option value="low_stock">Low Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => deletePackage(pkg.id)}
                            aria-label={`Delete ${pkg.title}`}
                            className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMERS & BACKUPS */}
          {tab === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-6 space-y-4">
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Player Directory (From Orders)
                </h3>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {uniqueCustomers.map((cust) => (
                    <div
                      key={cust.playerUid}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {cust.playerNickname}
                        </p>
                        <p className="text-xs font-mono-tabular text-slate-500 truncate">
                          UID {cust.playerUid} · {cust.customerPhone}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 font-mono-tabular shrink-0">
                        {cust.playerRegion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-4 sm:p-6 space-y-4">
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Data Export & LocalStorage Snapshot
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Export formatted CSV spreadsheets for bookkeeping or download a full JSON backup
                  of storefront packages and transaction logs.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => exportOrdersCsv(orders)}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download Orders CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const snapshot = JSON.stringify({ packages, orders, uidLogs }, null, 2);
                      const blob = new Blob([snapshot], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `muhammad-topup-backup-${new Date()
                        .toISOString()
                        .slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast('JSON Backup Saved', 'Storefront snapshot downloaded.', 'success');
                    }}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
