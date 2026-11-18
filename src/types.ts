export type Language = 'en' | 'ur';

export type StoreView = 'store' | 'orders' | 'admin';

export type PackageCategory = 'all' | 'starter' | 'popular' | 'mega' | 'offers';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'card' | 'wallet';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface DiamondPackage {
  id: string;
  diamonds: number;
  bonusDiamonds: number;
  title: string;
  category: Exclude<PackageCategory, 'all' | 'offers'>;
  pricePkr: number;
  originalPricePkr?: number;
  discountPercent?: number;
  offerLabel?: string;
  imageUrl: string;
  stockStatus: StockStatus;
  featured?: boolean;
}

export interface PlayerProfile {
  uid: string;
  nickname: string;
  region?: string;
  level?: number;
  avatarUrl?: string;
  avatarId?: string;
  guildName?: string;
  guildId?: string;
  rankTier?: string;
  likes?: number;
  signature?: string;
  badgeCount?: number;
  lastLoginAt?: string;
  extraFields?: Array<{ label: string; value: string }>;
  verifiedAt: string;
  source?: string;
}

export interface LookupDiagnostic {
  httpStatus?: number;
  contentType?: string;
  latencyMs?: number;
  mappedRegion?: string;
  topLevelKeys?: string[];
  providerHost?: string | null;
}

export interface UidLookupLog {
  id: string;
  uid: string;
  region: string;
  status: 'found' | 'not_found' | 'error';
  nickname?: string;
  message: string;
  checkedAt: string;
}

export interface UidApiStatus {
  checked: boolean;
  uidApiConfigured: boolean;
  providerHost: string | null;
  method?: string;
  hasApiKey?: boolean;
  regionMapping?: Record<string, string>;
}

export interface UidDiagnosticReport {
  ok: boolean;
  uidApiConfigured: boolean;
  providerHost: string | null;
  method: string;
  uidParam: string;
  regionParam: string;
  hasApiKey: boolean;
  hasApiHost: boolean;
  regionMapping: Record<string, string>;
  probe?: {
    attempted: boolean;
    reachable: boolean;
    httpStatus?: number;
    contentType?: string;
    latencyMs?: number;
    topLevelKeys?: string[];
    errorCode?: string;
    message: string;
  };
}

export interface Order {
  id: string;
  packageId: string;
  packageTitle: string;
  diamonds: number;
  bonusDiamonds: number;
  amountPkr: number;
  discountPkr: number;
  promoCode?: string;
  playerUid: string;
  playerNickname: string;
  playerRegion: string;
  paymentMethod: PaymentMethod;
  paymentAccount: string;
  transactionRef: string;
  customerPhone: string;
  customerEmail: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  receiptSent: boolean;
  reviewed?: boolean;
  offlineQueued?: boolean;
}

export interface Review {
  id: string;
  orderId?: string;
  playerName: string;
  playerUidMasked: string;
  rating: number;
  comment: string;
  packagePurchased: string;
  createdAt: string;
  verified: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  createdAt: string;
  read: boolean;
}

export interface UserSession {
  phone: string;
  email: string;
  displayName: string;
  authProvider: 'phone_otp' | 'google' | 'facebook' | 'biometric';
  biometricEnabled: boolean;
  loggedInAt: string;
}
