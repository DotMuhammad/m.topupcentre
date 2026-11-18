import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

export interface NormalizedPlayerProfile {
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
  extraFields: Array<{ label: string; value: string }>;
  verifiedAt: string;
  source: string;
}

const DEFAULT_REGION_MAP: Record<string, string> = {
  PK: 'PK',
  SG: 'SG',
  ME: 'ME',
  IND: 'IND',
  ID: 'ID',
  BR: 'BR',
  BD: 'BD',
  US: 'US',
  TH: 'TH',
  GLOBAL: 'SG',
};

// Simple in-memory sliding-window rate limiter per client IP
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;
const rateBuckets = new Map<string, number[]>();

export function resetRateLimiter() {
  rateBuckets.clear();
}

function uidRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const timestamps = (rateBuckets.get(clientIp) || []).filter((ts) => now - ts < RATE_WINDOW_MS);

  if (timestamps.length >= RATE_MAX_REQUESTS) {
    const oldest = timestamps[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      ok: false,
      code: 'CLIENT_RATE_LIMIT',
      error: `Too many UID lookup requests. Please wait ${retryAfterSec}s before trying again.`,
    });
    return;
  }

  timestamps.push(now);
  rateBuckets.set(clientIp, timestamps);
  next();
}

function getRegionMapping(): Record<string, string> {
  const customRaw = process.env.FREEFIRE_REGION_MAP?.trim();
  if (!customRaw) return DEFAULT_REGION_MAP;
  try {
    const parsed = JSON.parse(customRaw) as Record<string, unknown>;
    const merged: Record<string, string> = { ...DEFAULT_REGION_MAP };
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim()) {
        merged[k.toUpperCase()] = v.trim();
      }
    }
    return merged;
  } catch {
    return DEFAULT_REGION_MAP;
  }
}

export function mapRegionForProvider(requestedRegion: string): {
  valid: boolean;
  requested: string;
  mapped: string;
} {
  const upper = requestedRegion.trim().toUpperCase() || 'PK';
  const regionMap = getRegionMapping();
  if (!regionMap[upper] && !/^[A-Z0-9_-]{2,8}$/.test(upper)) {
    return { valid: false, requested: upper, mapped: '' };
  }
  let mapped = regionMap[upper] || upper;
  const caseMode = process.env.FREEFIRE_REGION_CASE?.trim().toLowerCase();
  if (caseMode === 'lower') {
    mapped = mapped.toLowerCase();
  } else if (caseMode === 'upper') {
    mapped = mapped.toUpperCase();
  }
  return { valid: true, requested: upper, mapped };
}

function asNonEmptyString(val: unknown): string | undefined {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return String(val);
  }
  return undefined;
}

function asFiniteNumber(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function isObjectRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function pickFirstRecord(
  root: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const candidate = root[key];
    if (isObjectRecord(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export function normalizeUpstreamPlayer(
  raw: Record<string, unknown>,
  requestedUid: string,
  requestedRegion: string,
  sourceHost: string
): NormalizedPlayerProfile | null {
  const container =
    pickFirstRecord(raw, ['data', 'result', 'response', 'player', 'account', 'profile', 'user']) ||
    raw;

  const basic =
    pickFirstRecord(container, ['basicInfo', 'BasicInfo', 'AccountInfo', 'accountInfo', 'player']) ||
    pickFirstRecord(raw, ['basicInfo', 'BasicInfo', 'AccountInfo', 'accountInfo']) ||
    container;

  const clan =
    pickFirstRecord(container, ['clanBasicInfo', 'GuildInfo', 'guildInfo', 'guild', 'clan']) ||
    pickFirstRecord(raw, ['clanBasicInfo', 'GuildInfo', 'guildInfo', 'guild', 'clan']);

  const social =
    pickFirstRecord(container, ['socialInfo', 'SocialInfo']) ||
    pickFirstRecord(raw, ['socialInfo', 'SocialInfo']) ||
    container;

  const profileInfo =
    pickFirstRecord(container, ['profileInfo', 'ProfileInfo', 'AccountProfileInfo']) ||
    pickFirstRecord(raw, ['profileInfo', 'ProfileInfo', 'AccountProfileInfo']);

  const equipped =
    pickFirstRecord(container, ['EquippedItemsInfo', 'equippedItemsInfo']) ||
    pickFirstRecord(raw, ['EquippedItemsInfo', 'equippedItemsInfo']);

  const guildOwner =
    pickFirstRecord(container, ['GuildOwnerInfo', 'captainBasicInfo']) ||
    pickFirstRecord(raw, ['GuildOwnerInfo', 'captainBasicInfo']);

  const nickname =
    asNonEmptyString(basic.nickname) ||
    asNonEmptyString(basic.AccountName) ||
    asNonEmptyString(basic.playerName) ||
    asNonEmptyString(basic.player_name) ||
    asNonEmptyString(basic.ign) ||
    asNonEmptyString(basic.inGameName) ||
    asNonEmptyString(basic.username) ||
    asNonEmptyString(basic.name) ||
    asNonEmptyString(container.nickname) ||
    asNonEmptyString(container.username) ||
    asNonEmptyString(container.name);

  if (!nickname) {
    return null;
  }

  const uid =
    asNonEmptyString(basic.accountId) ||
    asNonEmptyString(basic.uid) ||
    asNonEmptyString(basic.userId) ||
    asNonEmptyString(basic.id) ||
    asNonEmptyString(social.accountId) ||
    asNonEmptyString(guildOwner?.accountId) ||
    asNonEmptyString(container.uid) ||
    asNonEmptyString(container.accountId) ||
    requestedUid;

  const level =
    asFiniteNumber(basic.level) ??
    asFiniteNumber(basic.AccountLevel) ??
    asFiniteNumber(container.level);

  const region =
    asNonEmptyString(basic.region) ||
    asNonEmptyString(basic.AccountRegion) ||
    asNonEmptyString(basic.server) ||
    asNonEmptyString(container.region) ||
    requestedRegion;

  const rawAvatarUrl =
    asNonEmptyString(basic.headPicUrl) ||
    asNonEmptyString(basic.avatarUrl) ||
    asNonEmptyString(basic.profileImage) ||
    asNonEmptyString(basic.profile_url) ||
    asNonEmptyString(container.avatarUrl) ||
    asNonEmptyString(container.profileImage) ||
    (typeof basic.avatar === 'string' && /^https?:\/\//i.test(basic.avatar)
      ? basic.avatar
      : undefined);

  const avatarId =
    asNonEmptyString(equipped?.EquippedAvatarId) ||
    asNonEmptyString(basic.headPic) ||
    asNonEmptyString(guildOwner?.headPic) ||
    asNonEmptyString(profileInfo?.avatarId) ||
    asNonEmptyString(basic.AccountAvatarId) ||
    (!rawAvatarUrl ? asNonEmptyString(basic.avatar) : undefined);

  const guildName =
    asNonEmptyString(clan?.clanName) ||
    asNonEmptyString(clan?.GuildName) ||
    asNonEmptyString(clan?.name) ||
    asNonEmptyString(container.guildName) ||
    asNonEmptyString(container.guild_name);

  const guildId =
    asNonEmptyString(clan?.clanId) ||
    asNonEmptyString(clan?.GuildID) ||
    asNonEmptyString(clan?.id) ||
    asNonEmptyString(container.guildId) ||
    asNonEmptyString(container.guild_id);

  const rankTier =
    asNonEmptyString(basic.rankTier) ||
    asNonEmptyString(basic.rank) ||
    asNonEmptyString(container.rankTier) ||
    asNonEmptyString(container.rank);

  const likes =
    asFiniteNumber(basic.liked) ??
    asFiniteNumber(basic.AccountLikes) ??
    asFiniteNumber(basic.likes) ??
    asFiniteNumber(container.likes);

  const signature =
    asNonEmptyString(social.signature) ||
    asNonEmptyString(social.AccountSignature) ||
    asNonEmptyString(container.signature) ||
    asNonEmptyString(container.bio);

  const badgeCount =
    asFiniteNumber(equipped?.EquippedBPBadges) ??
    asFiniteNumber(basic.badgeCnt) ??
    asFiniteNumber(container.badgeCount);

  const rawLastLogin =
    asNonEmptyString(basic.lastLoginAt) ||
    asNonEmptyString(basic.AccountLastLogin) ||
    asNonEmptyString(container.lastLoginAt);
  const lastLoginAt = rawLastLogin && rawLastLogin !== '0' ? rawLastLogin : undefined;

  const extraFields: Array<{ label: string; value: string }> = [];
  const pushExtra = (label: string, val: unknown) => {
    if (extraFields.length >= 6) return;
    const str = asNonEmptyString(val);
    if (str) extraFields.push({ label, value: str });
  };

  if (asNonEmptyString(raw.ReleaseVersion)) {
    pushExtra('Game Version', raw.ReleaseVersion);
  }
  if (profileInfo) {
    const brPts = asFiniteNumber(profileInfo.BrRankPoint);
    if (brPts !== undefined && brPts > 0) pushExtra('BR Rank Points', brPts.toLocaleString('en-PK'));
    const csPts = asFiniteNumber(profileInfo.CsRankPoint);
    if (csPts !== undefined && csPts > 0) pushExtra('CS Rank Points', csPts.toLocaleString('en-PK'));
  }
  if (asFiniteNumber(basic.PrimeLevel) !== undefined) {
    pushExtra('Prime Level', basic.PrimeLevel);
  }
  if (clan && asFiniteNumber(clan.GuildLevel) !== undefined) {
    pushExtra('Guild Level', clan.GuildLevel);
  }

  return {
    uid,
    nickname,
    region,
    level,
    avatarUrl: rawAvatarUrl,
    avatarId: avatarId && avatarId !== '0' ? avatarId : undefined,
    guildName,
    guildId,
    rankTier,
    likes,
    signature,
    badgeCount,
    lastLoginAt,
    extraFields,
    verifiedAt: new Date().toISOString(),
    source: sourceHost,
  };
}

function buildProviderRequest(uid: string, mappedRegion: string): {
  url: string;
  host: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
} {
  const templateUrl = process.env.FREEFIRE_API_URL?.trim() || '';
  const method = (process.env.FREEFIRE_API_METHOD?.trim() || 'GET').toUpperCase();
  const uidParam = process.env.FREEFIRE_UID_PARAM?.trim() || 'uid';
  const regionParam = process.env.FREEFIRE_REGION_PARAM?.trim() || 'region';

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const apiKey = process.env.FREEFIRE_API_KEY?.trim();
  const keyHeader = process.env.FREEFIRE_API_KEY_HEADER?.trim() || 'x-api-key';
  if (apiKey) {
    headers[keyHeader] =
      keyHeader.toLowerCase() === 'authorization' && !apiKey.startsWith('Bearer ')
        ? `Bearer ${apiKey}`
        : apiKey;
  }

  const apiHost = process.env.FREEFIRE_API_HOST?.trim();
  if (apiHost) {
    headers['x-rapidapi-host'] = apiHost;
  }

  let targetUrl: string;
  let body: string | undefined;

  if (method === 'POST') {
    targetUrl = templateUrl
      .replace(/\{uid\}|\{userId\}/g, encodeURIComponent(uid))
      .replace(/\{region\}|\{server\}/g, encodeURIComponent(mappedRegion));
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      [uidParam]: uid,
      [regionParam]: mappedRegion,
    });
  } else if (/\{uid\}|\{userId\}|\{region\}|\{server\}/i.test(templateUrl)) {
    targetUrl = templateUrl
      .replace(/\{uid\}|\{userId\}/gi, encodeURIComponent(uid))
      .replace(/\{region\}|\{server\}/gi, encodeURIComponent(mappedRegion));
  } else {
    const parsed = new URL(templateUrl);
    parsed.searchParams.set(uidParam, uid);
    parsed.searchParams.set(regionParam, mappedRegion);
    targetUrl = parsed.toString();
  }

  const host = new URL(targetUrl).host;
  return { url: targetUrl, host, method, headers, body };
}

async function handleUidLookupRequest(req: Request, res: Response) {
  const rawUid = typeof req.query.uid === 'string' ? req.query.uid.replace(/\D/g, '') : '';
  const requestedRegion = typeof req.query.region === 'string' ? req.query.region : 'PK';

  if (!/^\d{6,14}$/.test(rawUid) || /^0+$/.test(rawUid)) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_UID',
      error: 'Enter a valid numeric Free Fire Player UID (6–14 digits).',
    });
    return;
  }

  const regionInfo = mapRegionForProvider(requestedRegion);
  if (!regionInfo.valid) {
    res.status(400).json({
      ok: false,
      code: 'UNSUPPORTED_REGION',
      error: `Unsupported region code: ${requestedRegion}.`,
    });
    return;
  }

  const templateUrl = process.env.FREEFIRE_API_URL?.trim();
  if (!templateUrl) {
    res.status(503).json({
      ok: false,
      code: 'API_NOT_CONFIGURED',
      error:
        'Live UID lookup API is not configured on the server. Set FREEFIRE_API_URL (and FREEFIRE_API_KEY if required) in environment secrets.',
      diagnostic: {
        mappedRegion: regionInfo.mapped,
        providerHost: null,
      },
    });
    return;
  }

  let reqInfo: ReturnType<typeof buildProviderRequest>;
  try {
    reqInfo = buildProviderRequest(rawUid, regionInfo.mapped);
  } catch {
    res.status(500).json({
      ok: false,
      code: 'INVALID_API_URL',
      error: 'Server FREEFIRE_API_URL is malformed.',
    });
    return;
  }

  const startedAt = Date.now();
  try {
    const upstream = await fetch(reqInfo.url, {
      method: reqInfo.method,
      headers: reqInfo.headers,
      body: reqInfo.body,
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - startedAt;
    const contentType = upstream.headers.get('content-type') || 'unknown';

    if (upstream.status === 401 || upstream.status === 403) {
      res.status(401).json({
        ok: false,
        code: 'API_AUTH_ERROR',
        error: 'Free Fire lookup API authentication failed. Verify server API key and header configuration.',
        diagnostic: {
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          mappedRegion: regionInfo.mapped,
          providerHost: reqInfo.host,
        },
      });
      return;
    }

    if (upstream.status === 429) {
      res.status(429).json({
        ok: false,
        code: 'API_RATE_LIMIT',
        error: 'Player lookup API rate limit reached. Please wait a moment and try again.',
        diagnostic: {
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          mappedRegion: regionInfo.mapped,
          providerHost: reqInfo.host,
        },
      });
      return;
    }

    if (upstream.status === 402 || upstream.status === 404) {
      let providerErrMsg = `Free Fire UID ${rawUid} (${regionInfo.requested}) was not found.`;
      if (contentType.toLowerCase().includes('json')) {
        try {
          const errBody = (await upstream.json()) as Record<string, unknown>;
          const msg =
            asNonEmptyString(errBody.error) ||
            asNonEmptyString(errBody.message) ||
            asNonEmptyString(errBody.msg);
          if (msg) providerErrMsg = msg;
        } catch {
          // keep default message
        }
      }
      res.status(404).json({
        ok: false,
        code: 'UID_NOT_FOUND',
        error: providerErrMsg,
        diagnostic: {
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          mappedRegion: regionInfo.mapped,
          providerHost: reqInfo.host,
        },
      });
      return;
    }

    if (upstream.status >= 500) {
      res.status(502).json({
        ok: false,
        code: 'PROVIDER_DOWNTIME',
        error: `Upstream Free Fire lookup provider returned server error (HTTP ${upstream.status}).`,
        diagnostic: {
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          mappedRegion: regionInfo.mapped,
          providerHost: reqInfo.host,
        },
      });
      return;
    }

    if (!upstream.ok) {
      res.status(502).json({
        ok: false,
        code: 'UPSTREAM_ERROR',
        error: `Free Fire lookup API returned HTTP ${upstream.status}.`,
        diagnostic: {
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          mappedRegion: regionInfo.mapped,
          providerHost: reqInfo.host,
        },
      });
      return;
    }

    if (!contentType.toLowerCase().includes('json')) {
      res.status(502).json({
        ok: false,
        code: 'INVALID_RESPONSE_FORMAT',
        error: `Free Fire lookup provider returned unexpected content type (${contentType}) instead of JSON.`,
        diagnostic: {
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          mappedRegion: regionInfo.mapped,
          providerHost: reqInfo.host,
        },
      });
      return;
    }

    const payload = (await upstream.json()) as Record<string, unknown>;
    const topLevelKeys = isObjectRecord(payload) ? Object.keys(payload).slice(0, 12) : [];

    if (
      payload.ok === false ||
      payload.success === false ||
      payload.status === false ||
      typeof payload.error === 'string'
    ) {
      const msg =
        asNonEmptyString(payload.error) ||
        asNonEmptyString(payload.message) ||
        asNonEmptyString(payload.msg) ||
        `Free Fire UID ${rawUid} (${regionInfo.requested}) could not be verified.`;
      res.status(404).json({
        ok: false,
        code: 'UID_NOT_FOUND',
        error: msg,
        diagnostic: {
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          mappedRegion: regionInfo.mapped,
          topLevelKeys,
          providerHost: reqInfo.host,
        },
      });
      return;
    }

    const normalized = normalizeUpstreamPlayer(
      payload,
      rawUid,
      regionInfo.requested,
      reqInfo.host
    );

    if (!normalized) {
      res.status(404).json({
        ok: false,
        code: 'UID_NOT_FOUND',
        error: `Player profile fields were not found for UID ${rawUid} (${regionInfo.requested}).`,
        diagnostic: {
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          mappedRegion: regionInfo.mapped,
          topLevelKeys,
          providerHost: reqInfo.host,
        },
      });
      return;
    }

    res.json({
      ok: true,
      player: normalized,
      diagnostic: {
        httpStatus: upstream.status,
        contentType,
        latencyMs,
        mappedRegion: regionInfo.mapped,
        topLevelKeys,
        providerHost: reqInfo.host,
      },
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    res.status(502).json({
      ok: false,
      code: isTimeout ? 'API_TIMEOUT' : 'API_UNAVAILABLE',
      error: isTimeout
        ? 'Free Fire lookup API timed out. Please try again.'
        : 'Unable to reach the configured Free Fire lookup API.',
      diagnostic: {
        latencyMs,
        mappedRegion: regionInfo.mapped,
        providerHost: reqInfo.host,
      },
    });
  }
}

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    const apiUrl = process.env.FREEFIRE_API_URL?.trim();
    let providerHost: string | null = null;
    if (apiUrl) {
      try {
        providerHost = new URL(apiUrl.replace(/\{[^}]+\}/g, '0')).host;
      } catch {
        providerHost = 'invalid-url';
      }
    }
    res.json({
      ok: true,
      uidApiConfigured: Boolean(apiUrl),
      providerHost,
      method: (process.env.FREEFIRE_API_METHOD?.trim() || 'GET').toUpperCase(),
      hasApiKey: Boolean(process.env.FREEFIRE_API_KEY?.trim()),
      regionMapping: getRegionMapping(),
    });
  });

  app.get('/api/uid-diagnostics', async (req: Request, res: Response) => {
    const apiUrl = process.env.FREEFIRE_API_URL?.trim();
    const method = (process.env.FREEFIRE_API_METHOD?.trim() || 'GET').toUpperCase();
    const uidParam = process.env.FREEFIRE_UID_PARAM?.trim() || 'uid';
    const regionParam = process.env.FREEFIRE_REGION_PARAM?.trim() || 'region';
    const hasApiKey = Boolean(process.env.FREEFIRE_API_KEY?.trim());
    const hasApiHost = Boolean(process.env.FREEFIRE_API_HOST?.trim());
    const regionMapping = getRegionMapping();

    let providerHost: string | null = null;
    let urlValid = false;
    if (apiUrl) {
      try {
        providerHost = new URL(apiUrl.replace(/\{[^}]+\}/g, '0')).host;
        urlValid = true;
      } catch {
        providerHost = 'invalid-url';
      }
    }

    const shouldProbe = req.query.probe === 'true';
    if (!shouldProbe) {
      res.json({
        ok: Boolean(apiUrl && urlValid),
        uidApiConfigured: Boolean(apiUrl),
        providerHost,
        method,
        uidParam,
        regionParam,
        hasApiKey,
        hasApiHost,
        regionMapping,
      });
      return;
    }

    if (!apiUrl || !urlValid) {
      res.status(503).json({
        ok: false,
        uidApiConfigured: Boolean(apiUrl),
        providerHost,
        method,
        uidParam,
        regionParam,
        hasApiKey,
        hasApiHost,
        regionMapping,
        probe: {
          attempted: false,
          reachable: false,
          errorCode: apiUrl ? 'INVALID_API_URL' : 'API_NOT_CONFIGURED',
          message: apiUrl
            ? 'FREEFIRE_API_URL is malformed.'
            : 'FREEFIRE_API_URL is not configured in server environment variables.',
        },
      });
      return;
    }

    const probeUid =
      typeof req.query.uid === 'string' && /^\d{6,14}$/.test(req.query.uid.trim())
        ? req.query.uid.trim()
        : '1922204750';
    const regionCheck = mapRegionForProvider(
      typeof req.query.region === 'string' ? req.query.region : 'PK'
    );

    const startedAt = Date.now();
    try {
      const reqInfo = buildProviderRequest(probeUid, regionCheck.mapped || 'PK');
      const upstream = await fetch(reqInfo.url, {
        method: reqInfo.method,
        headers: reqInfo.headers,
        body: reqInfo.body,
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - startedAt;
      const contentType = upstream.headers.get('content-type') || 'unknown';

      let topLevelKeys: string[] = [];
      if (contentType.toLowerCase().includes('json')) {
        try {
          const json = (await upstream.json()) as unknown;
          if (isObjectRecord(json)) {
            topLevelKeys = Object.keys(json).slice(0, 12);
          }
        } catch {
          // ignore parse issue for diagnostic summary
        }
      }

      const authFailed = upstream.status === 401 || upstream.status === 403;
      const rateLimited = upstream.status === 429;
      res.json({
        ok: upstream.status < 500 && !authFailed,
        uidApiConfigured: true,
        providerHost,
        method,
        uidParam,
        regionParam,
        hasApiKey,
        hasApiHost,
        regionMapping,
        probe: {
          attempted: true,
          reachable: true,
          httpStatus: upstream.status,
          contentType,
          latencyMs,
          topLevelKeys,
          errorCode: authFailed
            ? 'API_AUTH_ERROR'
            : rateLimited
            ? 'API_RATE_LIMIT'
            : undefined,
          message: authFailed
            ? `Provider rejected credentials (HTTP ${upstream.status}). Check FREEFIRE_API_KEY / headers.`
            : rateLimited
            ? 'Provider rate limit active (HTTP 429).'
            : `Provider reachable (HTTP ${upstream.status}) in ${latencyMs}ms.`,
        },
      });
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const isTimeout = err instanceof Error && err.name === 'TimeoutError';
      res.status(502).json({
        ok: false,
        uidApiConfigured: true,
        providerHost,
        method,
        uidParam,
        regionParam,
        hasApiKey,
        hasApiHost,
        regionMapping,
        probe: {
          attempted: true,
          reachable: false,
          latencyMs,
          errorCode: isTimeout ? 'API_TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout
            ? 'Connection to FREEFIRE_API_URL timed out after 8s.'
            : 'Unable to connect to FREEFIRE_API_URL from server.',
        },
      });
    }
  });

  app.get('/api/freefire/lookup', uidRateLimitMiddleware, handleUidLookupRequest);
  app.get('/api/player-lookup', uidRateLimitMiddleware, handleUidLookupRequest);

  return app;
}

async function startServer() {
  const app = createApp();

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Muhammad Topup Centre server running on port ${PORT}`);
  });
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
