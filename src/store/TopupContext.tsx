import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AppNotification,
  DiamondPackage,
  Language,
  Order,
  OrderStatus,
  PaymentMethod,
  PlayerProfile,
  Review,
  StoreView,
  UidApiStatus,
  UidLookupLog,
  UserSession,
} from '../types';
import {
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PACKAGES,
  INITIAL_REVIEWS,
} from '../data/seedData';
import { sanitizeRegionInput, sanitizeUidInput, useUIDLookup } from '../hooks/useUIDLookup';

const STORAGE_KEYS = {
  packages: 'mtc_packages_v1',
  orders: 'mtc_orders_v1',
  reviews: 'mtc_reviews_v1',
  notifications: 'mtc_notifications_v1',
  player: 'mtc_player_v1',
  session: 'mtc_session_v1',
  theme: 'mtc_theme_v1',
  lang: 'mtc_lang_v1',
  uidLogs: 'mtc_uid_logs_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues safely
  }
}

interface TopupContextValue {
  view: StoreView;
  setView: (view: StoreView) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  isOnline: boolean;

  packages: DiamondPackage[];
  updatePackage: (id: string, patch: Partial<DiamondPackage>) => void;
  addPackage: (pkg: Omit<DiamondPackage, 'id'>) => void;
  deletePackage: (id: string) => void;
  resetPackagesToDefault: () => void;

  uidApiStatus: UidApiStatus;
  playerProfile: PlayerProfile | null;
  verifyingPlayer: boolean;
  playerVerifyError: string | null;
  uidLogs: UidLookupLog[];
  recordUidLog: (entry: Omit<UidLookupLog, 'id' | 'checkedAt'>) => void;
  clearUidLogs: () => void;
  lookupPlayerByUid: (
    uid: string,
    region: string,
    options?: { saveAsActivePlayer?: boolean }
  ) => Promise<{ player: PlayerProfile | null; error: string | null }>;
  verifyPlayerId: (uid: string, region: string) => Promise<PlayerProfile | null>;
  clearPlayerProfile: () => void;

  orders: Order[];
  placeOrder: (input: {
    pkg: DiamondPackage;
    paymentMethod: PaymentMethod;
    paymentAccount: string;
    transactionRef: string;
    customerPhone: string;
    customerEmail: string;
    promoCode?: string;
    discountPkr: number;
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  reviews: Review[];
  submitReview: (input: {
    orderId?: string;
    playerName: string;
    playerUid: string;
    rating: number;
    comment: string;
    packagePurchased: string;
  }) => void;

  notifications: AppNotification[];
  unreadCount: number;
  markAllNotificationsRead: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;

  session: UserSession | null;
  loginWithOtp: (phone: string, email: string, displayName?: string) => void;
  loginWithSocial: (provider: 'google' | 'facebook') => void;
  loginWithBiometric: () => void;
  toggleBiometric: (enabled: boolean) => void;
  logout: () => void;

  toastMessage: { id: string; title: string; detail?: string; tone?: 'success' | 'info' | 'error' } | null;
  showToast: (title: string, detail?: string, tone?: 'success' | 'info' | 'error') => void;
  dismissToast: () => void;
}

const TopupContext = createContext<TopupContextValue | null>(null);

export const TopupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<StoreView>('store');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readStorage(STORAGE_KEYS.theme, 'dark'));
  const [lang, setLangState] = useState<Language>(() => readStorage(STORAGE_KEYS.lang, 'en'));
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [packages, setPackages] = useState<DiamondPackage[]>(() =>
    readStorage(STORAGE_KEYS.packages, INITIAL_PACKAGES)
  );
  const [orders, setOrders] = useState<Order[]>(() => readStorage(STORAGE_KEYS.orders, INITIAL_ORDERS));
  const [reviews, setReviews] = useState<Review[]>(() => readStorage(STORAGE_KEYS.reviews, INITIAL_REVIEWS));
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    readStorage(STORAGE_KEYS.notifications, INITIAL_NOTIFICATIONS)
  );
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(() => {
    const stored = readStorage<PlayerProfile | null>(STORAGE_KEYS.player, null);
    return stored && stored.source ? stored : null;
  });
  const [uidLogs, setUidLogs] = useState<UidLookupLog[]>(() =>
    readStorage(STORAGE_KEYS.uidLogs, [])
  );
  const [session, setSession] = useState<UserSession | null>(() =>
    readStorage(STORAGE_KEYS.session, null)
  );
  const [uidApiStatus, setUidApiStatus] = useState<UidApiStatus>({
    checked: false,
    uidApiConfigured: false,
    providerHost: null,
  });

  const [verifyingPlayer, setVerifyingPlayer] = useState(false);
  const [playerVerifyError, setPlayerVerifyError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<TopupContextValue['toastMessage']>(null);
  const { lookup: runUidLookup } = useUIDLookup();

  const showToast = useCallback(
    (title: string, detail?: string, tone: 'success' | 'info' | 'error' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToastMessage({ id, title, detail, tone });
    },
    []
  );

  const dismissToast = useCallback(() => setToastMessage(null), []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setUidApiStatus({
          checked: true,
          uidApiConfigured: Boolean(data.uidApiConfigured),
          providerHost: typeof data.providerHost === 'string' ? data.providerHost : null,
          method: typeof data.method === 'string' ? data.method : undefined,
          hasApiKey: Boolean(data.hasApiKey),
          regionMapping:
            data.regionMapping && typeof data.regionMapping === 'object'
              ? (data.regionMapping as Record<string, string>)
              : undefined,
        });
      })
      .catch(() => {
        if (!active) return;
        setUidApiStatus({ checked: true, uidApiConfigured: false, providerHost: null });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    writeStorage(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.lang, lang);
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.packages, packages);
  }, [packages]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.orders, orders);
  }, [orders]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.reviews, reviews);
  }, [reviews]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.notifications, notifications);
  }, [notifications]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.player, playerProfile);
  }, [playerProfile]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.uidLogs, uidLogs);
  }, [uidLogs]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.session, session);
  }, [session]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOrders((prev) => {
        const hasQueued = prev.some((o) => o.offlineQueued);
        if (hasQueued) {
          showToast('Connection Restored', 'Offline queued orders synced to processing queue.', 'success');
          return prev.map((o) => (o.offlineQueued ? { ...o, offlineQueued: false } : o));
        }
        return prev;
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode Active', 'Cached catalog remains available for browsing.', 'info');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const setLang = (next: Language) => setLangState(next);

  const addNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
      const item: AppNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [item, ...prev]);
    },
    []
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const recordUidLog = useCallback((entry: Omit<UidLookupLog, 'id' | 'checkedAt'>) => {
    const logItem: UidLookupLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      checkedAt: new Date().toISOString(),
    };
    setUidLogs((prev) => [logItem, ...prev].slice(0, 50));
  }, []);

  const clearUidLogs = useCallback(() => {
    setUidLogs([]);
  }, []);

  const lookupPlayerByUid: TopupContextValue['lookupPlayerByUid'] = async (
    rawUid,
    region,
    options = { saveAsActivePlayer: false }
  ) => {
    const cleaned = sanitizeUidInput(rawUid);
    const normalizedRegion = sanitizeRegionInput(region);

    if (options.saveAsActivePlayer) {
      setPlayerVerifyError(null);
      setVerifyingPlayer(true);
    }

    const result = await runUidLookup(cleaned, normalizedRegion);

    if (result.code === 'ABORTED') {
      if (options.saveAsActivePlayer) {
        setVerifyingPlayer(false);
      }
      return { player: null, error: null };
    }

    if (!result.player) {
      const errMsg = result.error || 'Free Fire UID lookup API is unavailable.';
      if (options.saveAsActivePlayer) {
        setPlayerProfile(null);
        setPlayerVerifyError(errMsg);
        setVerifyingPlayer(false);
      }

      recordUidLog({
        uid: cleaned || '(empty)',
        region: normalizedRegion,
        status: result.code === 'UID_NOT_FOUND' || result.code === 'HTTP_404' ? 'not_found' : 'error',
        message: errMsg,
      });
      return { player: null, error: errMsg };
    }

    const verifiedPlayer = result.player;
    if (options.saveAsActivePlayer) {
      setPlayerProfile(verifiedPlayer);
      setPlayerVerifyError(null);
      setVerifyingPlayer(false);
      showToast(
        'Player ID Verified',
        `${verifiedPlayer.nickname} (UID ${verifiedPlayer.uid}) loaded from live API.`,
        'success'
      );
    }

    recordUidLog({
      uid: verifiedPlayer.uid,
      region: verifiedPlayer.region || normalizedRegion,
      status: 'found',
      nickname: verifiedPlayer.nickname,
      message: `Verified ${verifiedPlayer.nickname}`,
    });

    return { player: verifiedPlayer, error: null };
  };

  const verifyPlayerId = async (rawUid: string, region: string): Promise<PlayerProfile | null> => {
    const result = await lookupPlayerByUid(rawUid, region, { saveAsActivePlayer: true });
    return result.player;
  };

  const clearPlayerProfile = () => {
    setPlayerProfile(null);
    setPlayerVerifyError(null);
  };

  const updatePackage = (id: string, patch: Partial<DiamondPackage>) => {
    setPackages((prev) =>
      prev.map((pkg) => {
        if (pkg.id !== id) return pkg;
        const next = { ...pkg, ...patch };
        if (next.originalPricePkr && next.originalPricePkr > next.pricePkr) {
          next.discountPercent = Math.round(
            ((next.originalPricePkr - next.pricePkr) / next.originalPricePkr) * 100
          );
        } else {
          next.discountPercent = undefined;
        }
        return next;
      })
    );
  };

  const addPackage = (pkg: Omit<DiamondPackage, 'id'>) => {
    const newPkg: DiamondPackage = {
      ...pkg,
      id: `pkg-${Date.now()}`,
    };
    setPackages((prev) => [...prev, newPkg].sort((a, b) => a.diamonds - b.diamonds));
    showToast('Package Added', `${pkg.title} added to live storefront.`, 'success');
  };

  const deletePackage = (id: string) => {
    setPackages((prev) => prev.filter((p) => p.id !== id));
    showToast('Package Removed', 'Storefront inventory updated.', 'info');
  };

  const resetPackagesToDefault = () => {
    setPackages(INITIAL_PACKAGES);
    showToast('Catalog Reset', 'Default 9 Free Fire packages restored.', 'info');
  };

  const placeOrder: TopupContextValue['placeOrder'] = ({
    pkg,
    paymentMethod,
    paymentAccount,
    transactionRef,
    customerPhone,
    customerEmail,
    promoCode,
    discountPkr,
  }) => {
    if (!playerProfile) {
      throw new Error('Verified player profile is required before placing an order.');
    }

    const orderNum = 8500 + orders.length + Math.floor(Math.random() * 90);
    const id = `MTC-${orderNum}`;
    const now = new Date().toISOString();
    const finalAmount = Math.max(0, pkg.pricePkr - discountPkr);

    const newOrder: Order = {
      id,
      packageId: pkg.id,
      packageTitle: pkg.title,
      diamonds: pkg.diamonds,
      bonusDiamonds: pkg.bonusDiamonds,
      amountPkr: finalAmount,
      discountPkr,
      promoCode: promoCode || undefined,
      playerUid: playerProfile.uid,
      playerNickname: playerProfile.nickname,
      playerRegion: playerProfile.region || 'PK',
      paymentMethod,
      paymentAccount,
      transactionRef,
      customerPhone,
      customerEmail,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      receiptSent: true,
      offlineQueued: !isOnline,
    };

    setOrders((prev) => [newOrder, ...prev]);

    addNotification({
      title: `Order ${id} Placed`,
      message: `${pkg.diamonds}${pkg.bonusDiamonds ? ` + ${pkg.bonusDiamonds}` : ''} Diamonds for ${
        playerProfile.nickname
      } (${playerProfile.uid}). Receipt prepared for ${customerEmail || customerPhone}.`,
      type: 'order',
    });

    showToast(
      `Order ${id} Confirmed`,
      `Email receipt generated for ${customerEmail || customerPhone}.`,
      'success'
    );

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const now = new Date().toISOString();
    let updatedOrder: Order | undefined;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        updatedOrder = { ...o, status, updatedAt: now };
        return updatedOrder;
      })
    );

    const statusLabel =
      status === 'completed'
        ? 'Completed & Credited'
        : status === 'processing'
        ? 'Processing in Queue'
        : status === 'cancelled'
        ? 'Cancelled'
        : 'Pending Verification';

    addNotification({
      title: `Order ${orderId} ${statusLabel}`,
      message: updatedOrder
        ? `${updatedOrder.diamonds} Diamonds for ${updatedOrder.playerNickname} (${updatedOrder.playerUid}) is now ${statusLabel}.`
        : `Order status changed to ${statusLabel}.`,
      type: 'order',
    });

    showToast(`Order ${orderId}`, `Status updated to ${statusLabel}.`, 'success');
  };

  const submitReview: TopupContextValue['submitReview'] = ({
    orderId,
    playerName,
    playerUid,
    rating,
    comment,
    packagePurchased,
  }) => {
    const maskedUid =
      playerUid.length >= 7
        ? `UID ${playerUid.slice(0, 4)}***${playerUid.slice(-3)}`
        : `UID ${playerUid}`;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      orderId,
      playerName: playerName.trim() || 'Verified Player',
      playerUidMasked: maskedUid,
      rating,
      comment: comment.trim(),
      packagePurchased,
      createdAt: new Date().toISOString(),
      verified: true,
    };

    setReviews((prev) => [newReview, ...prev]);
    if (orderId) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, reviewed: true } : o)));
    }
    showToast('Review Published', 'Thank you for rating Muhammad Topup Centre.', 'success');
  };

  const loginWithOtp = (phone: string, email: string, displayName?: string) => {
    const next: UserSession = {
      phone,
      email: email || `${phone.replace(/\D/g, '')}@players.mtc.pk`,
      displayName: displayName || playerProfile?.nickname || `Player ${phone.slice(-4)}`,
      authProvider: 'phone_otp',
      biometricEnabled: true,
      loggedInAt: new Date().toISOString(),
    };
    setSession(next);
    showToast('Signed In via OTP', `Authenticated as ${next.displayName}.`, 'success');
  };

  const loginWithSocial = (provider: 'google' | 'facebook') => {
    const next: UserSession = {
      phone: '0300-0000000',
      email: provider === 'google' ? 'player.google@mtc.pk' : 'player.meta@mtc.pk',
      displayName: playerProfile?.nickname || (provider === 'google' ? 'Google Player' : 'Meta Player'),
      authProvider: provider,
      biometricEnabled: true,
      loggedInAt: new Date().toISOString(),
    };
    setSession(next);
    showToast('Social Login Successful', `Signed in with ${provider === 'google' ? 'Google' : 'Facebook'}.`, 'success');
  };

  const loginWithBiometric = () => {
    const next: UserSession = {
      phone: '0301-4829104',
      email: 'verified.passkey@mtc.pk',
      displayName: playerProfile?.nickname || 'Biometric Verified Player',
      authProvider: 'biometric',
      biometricEnabled: true,
      loggedInAt: new Date().toISOString(),
    };
    setSession(next);
    showToast('Biometric Passkey Verified', 'Fast passkey sign-in unlocked.', 'success');
  };

  const toggleBiometric = (enabled: boolean) => {
    setSession((prev) => (prev ? { ...prev, biometricEnabled: enabled } : prev));
  };

  const logout = () => {
    setSession(null);
    showToast('Signed Out', 'You have securely logged out.', 'info');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <TopupContext.Provider
      value={{
        view,
        setView,
        theme,
        toggleTheme,
        lang,
        setLang,
        isOnline,
        packages,
        updatePackage,
        addPackage,
        deletePackage,
        resetPackagesToDefault,
        uidApiStatus,
        playerProfile,
        verifyingPlayer,
        playerVerifyError,
        uidLogs,
        recordUidLog,
        clearUidLogs,
        lookupPlayerByUid,
        verifyPlayerId,
        clearPlayerProfile,
        orders,
        placeOrder,
        updateOrderStatus,
        reviews,
        submitReview,
        notifications,
        unreadCount,
        markAllNotificationsRead,
        addNotification,
        session,
        loginWithOtp,
        loginWithSocial,
        loginWithBiometric,
        toggleBiometric,
        logout,
        toastMessage,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </TopupContext.Provider>
  );
};

export function useTopup() {
  const ctx = useContext(TopupContext);
  if (!ctx) throw new Error('useTopup must be used inside TopupProvider');
  return ctx;
}
