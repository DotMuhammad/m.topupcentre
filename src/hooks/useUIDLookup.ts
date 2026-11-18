import { useCallback, useEffect, useRef, useState } from 'react';
import { LookupDiagnostic, PlayerProfile } from '../types';

export type UIDLookupStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UIDLookupResult {
  player: PlayerProfile | null;
  error: string | null;
  code: string | null;
  diagnostic: LookupDiagnostic | null;
  sanitizedUid: string;
  sanitizedRegion: string;
}

export interface UseUIDLookupOptions {
  region?: string;
  endpointOverride?: string;
  enabled?: boolean;
  onResult?: (result: UIDLookupResult) => void;
}

export interface UseUIDLookupReturn {
  status: UIDLookupStatus;
  loading: boolean;
  data: PlayerProfile | null;
  player: PlayerProfile | null;
  error: string | null;
  errorCode: string | null;
  diagnostic: LookupDiagnostic | null;
  lookup: (rawUid: string, rawRegion?: string) => Promise<UIDLookupResult>;
  refetch: () => Promise<UIDLookupResult | null>;
  reset: () => void;
}

export function sanitizeUidInput(rawUid: string): string {
  return String(rawUid ?? '')
    .normalize('NFKC')
    .replace(/\D/g, '')
    .slice(0, 14);
}

export function sanitizeRegionInput(rawRegion?: string): string {
  const cleaned = String(rawRegion ?? '')
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 8);
  return cleaned || 'PK';
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
    if (isObjectRecord(candidate)) return candidate;
  }
  return undefined;
}

function normalizeApiResponse(
  payload: Record<string, unknown>,
  uid: string,
  region: string,
  sourceHost: string
): PlayerProfile | null {
  if (isObjectRecord(payload.player) && asNonEmptyString(payload.player.nickname)) {
    return payload.player as unknown as PlayerProfile;
  }

  const container =
    pickFirstRecord(payload, ['data', 'result', 'response', 'player', 'account', 'profile', 'user']) ||
    payload;

  const basic =
    pickFirstRecord(container, ['basicInfo', 'BasicInfo', 'AccountInfo', 'accountInfo', 'player']) ||
    pickFirstRecord(payload, ['basicInfo', 'BasicInfo', 'AccountInfo', 'accountInfo']) ||
    container;

  const clan =
    pickFirstRecord(container, ['clanBasicInfo', 'GuildInfo', 'guildInfo', 'guild', 'clan']) ||
    pickFirstRecord(payload, ['clanBasicInfo', 'GuildInfo', 'guildInfo', 'guild', 'clan']);

  const social =
    pickFirstRecord(container, ['socialInfo', 'SocialInfo']) ||
    pickFirstRecord(payload, ['socialInfo', 'SocialInfo']) ||
    container;

  const profileInfo =
    pickFirstRecord(container, ['profileInfo', 'ProfileInfo']) ||
    pickFirstRecord(payload, ['profileInfo', 'ProfileInfo']);

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

  const rawAvatarUrl =
    asNonEmptyString(basic.headPicUrl) ||
    asNonEmptyString(basic.avatarUrl) ||
    asNonEmptyString(basic.profileImage) ||
    asNonEmptyString(basic.profile_url) ||
    asNonEmptyString(container.avatarUrl) ||
    (typeof basic.avatar === 'string' && /^https?:\/\//i.test(basic.avatar)
      ? basic.avatar
      : undefined);

  const avatarId =
    asNonEmptyString(basic.headPic) ||
    asNonEmptyString(profileInfo?.avatarId) ||
    asNonEmptyString(basic.AccountAvatarId) ||
    (!rawAvatarUrl ? asNonEmptyString(basic.avatar) : undefined);

  const rawLastLogin =
    asNonEmptyString(basic.lastLoginAt) ||
    asNonEmptyString(basic.AccountLastLogin) ||
    asNonEmptyString(container.lastLoginAt);

  return {
    uid:
      asNonEmptyString(basic.accountId) ||
      asNonEmptyString(basic.uid) ||
      asNonEmptyString(basic.userId) ||
      asNonEmptyString(container.uid) ||
      uid,
    nickname,
    region:
      asNonEmptyString(basic.region) ||
      asNonEmptyString(basic.AccountRegion) ||
      asNonEmptyString(basic.server) ||
      asNonEmptyString(container.region) ||
      region,
    level:
      asFiniteNumber(basic.level) ??
      asFiniteNumber(basic.AccountLevel) ??
      asFiniteNumber(container.level),
    avatarUrl: rawAvatarUrl,
    avatarId: avatarId && avatarId !== '0' ? avatarId : undefined,
    guildName:
      asNonEmptyString(clan?.clanName) ||
      asNonEmptyString(clan?.GuildName) ||
      asNonEmptyString(clan?.name) ||
      asNonEmptyString(container.guildName) ||
      asNonEmptyString(container.guild_name),
    guildId:
      asNonEmptyString(clan?.clanId) ||
      asNonEmptyString(clan?.GuildID) ||
      asNonEmptyString(clan?.id) ||
      asNonEmptyString(container.guildId) ||
      asNonEmptyString(container.guild_id),
    rankTier:
      asNonEmptyString(basic.rankTier) ||
      asNonEmptyString(basic.rank) ||
      asNonEmptyString(container.rankTier),
    likes:
      asFiniteNumber(basic.liked) ??
      asFiniteNumber(basic.AccountLikes) ??
      asFiniteNumber(basic.likes) ??
      asFiniteNumber(container.likes),
    signature:
      asNonEmptyString(social.signature) ||
      asNonEmptyString(social.AccountSignature) ||
      asNonEmptyString(container.signature),
    badgeCount: asFiniteNumber(basic.badgeCnt) ?? asFiniteNumber(container.badgeCount),
    lastLoginAt: rawLastLogin && rawLastLogin !== '0' ? rawLastLogin : undefined,
    verifiedAt: new Date().toISOString(),
    source: sourceHost,
  };
}

function buildLookupUrl(baseUrl: string, uid: string, region: string): { url: string; host: string } {
  if (baseUrl.startsWith('/')) {
    const params = new URLSearchParams({ uid, region });
    return { url: `${baseUrl}?${params.toString()}`, host: 'server-proxy' };
  }

  let resolved: string;
  if (/\{uid\}|\{userId\}|\{region\}|\{server\}/i.test(baseUrl)) {
    resolved = baseUrl
      .replace(/\{uid\}|\{userId\}/gi, encodeURIComponent(uid))
      .replace(/\{region\}|\{server\}/gi, encodeURIComponent(region));
  } else {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set('uid', uid);
    parsed.searchParams.set('region', region);
    resolved = parsed.toString();
  }

  return { url: resolved, host: new URL(resolved).host };
}

export function useUIDLookup(options?: UseUIDLookupOptions): UseUIDLookupReturn;
export function useUIDLookup(uid: string, options?: UseUIDLookupOptions): UseUIDLookupReturn;
export function useUIDLookup(
  uidOrOptions?: string | UseUIDLookupOptions,
  maybeOptions?: UseUIDLookupOptions
): UseUIDLookupReturn {
  const initialUid = typeof uidOrOptions === 'string' ? uidOrOptions : undefined;
  const resolvedOptions: UseUIDLookupOptions =
    typeof uidOrOptions === 'string' ? maybeOptions ?? {} : uidOrOptions ?? {};

  const { region: defaultRegion = 'PK', endpointOverride, enabled = true, onResult } =
    resolvedOptions;

  const [status, setStatus] = useState<UIDLookupStatus>('idle');
  const [data, setData] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<LookupDiagnostic | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setData(null);
    setError(null);
    setErrorCode(null);
    setDiagnostic(null);
  }, []);

  const lookup = useCallback(
    async (rawUid: string, rawRegion?: string): Promise<UIDLookupResult> => {
      const sanitizedUid = sanitizeUidInput(rawUid);
      const sanitizedRegion = sanitizeRegionInput(rawRegion ?? defaultRegion);

      abortRef.current?.abort();

      if (!/^\d{6,14}$/.test(sanitizedUid) || /^0+$/.test(sanitizedUid)) {
        const msg = 'Player ID must be 6 to 14 numeric digits.';
        setStatus('error');
        setData(null);
        setError(msg);
        setErrorCode('INVALID_UID');
        setDiagnostic(null);
        const invalidResult: UIDLookupResult = {
          player: null,
          error: msg,
          code: 'INVALID_UID',
          diagnostic: null,
          sanitizedUid,
          sanitizedRegion,
        };
        onResultRef.current?.(invalidResult);
        return invalidResult;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('loading');
      setError(null);
      setErrorCode(null);

      const envClientUrl = import.meta.env.VITE_FREEFIRE_API_URL?.trim();
      const targetEndpoint = endpointOverride?.trim() || envClientUrl || '/api/freefire/lookup';

      try {
        const { url, host } = buildLookupUrl(targetEndpoint, sanitizedUid, sanitizedRegion);
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('json')) {
          const msg =
            'Backend UID lookup route returned a non-JSON response. Ensure the Express API server is running on /api/freefire/lookup.';
          const diag: LookupDiagnostic = {
            httpStatus: res.status,
            contentType: contentType || 'unknown',
            providerHost: host,
          };
          setStatus('error');
          setData(null);
          setError(msg);
          setErrorCode('INVALID_RESPONSE_FORMAT');
          setDiagnostic(diag);
          const formatFail: UIDLookupResult = {
            player: null,
            error: msg,
            code: 'INVALID_RESPONSE_FORMAT',
            diagnostic: diag,
            sanitizedUid,
            sanitizedRegion,
          };
          onResultRef.current?.(formatFail);
          return formatFail;
        }

        const payload = (await res.json()) as Record<string, unknown>;
        const diag = isObjectRecord(payload.diagnostic)
          ? (payload.diagnostic as unknown as LookupDiagnostic)
          : { httpStatus: res.status, contentType, providerHost: host };

        if (
          !res.ok ||
          payload.ok === false ||
          payload.success === false ||
          payload.status === false ||
          typeof payload.error === 'string'
        ) {
          const msg =
            asNonEmptyString(payload.error) ||
            asNonEmptyString(payload.message) ||
            asNonEmptyString(payload.msg) ||
            (res.status === 404
              ? `No Free Fire account found for UID ${sanitizedUid} (${sanitizedRegion}).`
              : `Free Fire UID lookup failed (HTTP ${res.status}).`);
          const code = asNonEmptyString(payload.code) || `HTTP_${res.status}`;

          setStatus('error');
          setData(null);
          setError(msg);
          setErrorCode(code);
          setDiagnostic(diag);
          const failResult: UIDLookupResult = {
            player: null,
            error: msg,
            code,
            diagnostic: diag,
            sanitizedUid,
            sanitizedRegion,
          };
          onResultRef.current?.(failResult);
          return failResult;
        }

        const normalized = normalizeApiResponse(payload, sanitizedUid, sanitizedRegion, host);

        if (!normalized) {
          const msg = `Player profile fields were not returned for UID ${sanitizedUid} (${sanitizedRegion}).`;
          setStatus('error');
          setData(null);
          setError(msg);
          setErrorCode('UID_NOT_FOUND');
          setDiagnostic(diag);
          const emptyResult: UIDLookupResult = {
            player: null,
            error: msg,
            code: 'UID_NOT_FOUND',
            diagnostic: diag,
            sanitizedUid,
            sanitizedRegion,
          };
          onResultRef.current?.(emptyResult);
          return emptyResult;
        }

        setStatus('success');
        setData(normalized);
        setError(null);
        setErrorCode(null);
        setDiagnostic(diag);
        const successResult: UIDLookupResult = {
          player: normalized,
          error: null,
          code: null,
          diagnostic: diag,
          sanitizedUid,
          sanitizedRegion,
        };
        onResultRef.current?.(successResult);
        return successResult;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return {
            player: null,
            error: null,
            code: 'ABORTED',
            diagnostic: null,
            sanitizedUid,
            sanitizedRegion,
          };
        }

        const msg = 'Unable to reach the Free Fire player lookup service.';
        setStatus('error');
        setData(null);
        setError(msg);
        setErrorCode('NETWORK_ERROR');
        setDiagnostic(null);
        const netResult: UIDLookupResult = {
          player: null,
          error: msg,
          code: 'NETWORK_ERROR',
          diagnostic: null,
          sanitizedUid,
          sanitizedRegion,
        };
        onResultRef.current?.(netResult);
        return netResult;
      }
    },
    [defaultRegion, endpointOverride]
  );

  useEffect(() => {
    if (!enabled || initialUid === undefined) return;
    const trimmed = initialUid.trim();
    if (!trimmed) {
      reset();
      return;
    }
    void lookup(trimmed, defaultRegion);
  }, [enabled, initialUid, defaultRegion, lookup, reset]);

  const refetch = useCallback(async () => {
    if (!initialUid || !initialUid.trim()) return null;
    return lookup(initialUid, defaultRegion);
  }, [initialUid, defaultRegion, lookup]);

  return {
    status,
    loading: status === 'loading',
    data,
    player: data,
    error,
    errorCode,
    diagnostic,
    lookup,
    refetch,
    reset,
  };
}
