import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createApp,
  mapRegionForProvider,
  normalizeUpstreamPlayer,
  resetRateLimiter,
} from '../server.ts';

describe('Muhammad Topup Centre — Free Fire UID Lookup & Diagnostics', () => {
  let providerServer: http.Server;
  let providerUrl = '';
  let appServer: http.Server;
  let appBaseUrl = '';

  const seenRequests: Array<{ url: string; headers: http.IncomingHttpHeaders; method?: string }> = [];

  before(async () => {
    providerServer = http.createServer((req, res) => {
      seenRequests.push({ url: req.url || '', headers: req.headers, method: req.method });
      const parsed = new URL(req.url || '/', 'http://127.0.0.1');
      const uid = parsed.searchParams.get('uid');
      const region = parsed.searchParams.get('region');
      const mode = parsed.searchParams.get('mode');

      if (mode === 'auth_fail') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid API key.' }));
        return;
      }

      if (mode === 'rate_limit') {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Too Many Requests' }));
        return;
      }

      if (mode === 'downtime') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Service Unavailable' }));
        return;
      }

      if (mode === 'html_error') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>Proxy Error Page</body></html>');
        return;
      }

      if (uid === '1922204750' && (region === 'PK' || region === 'pk')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            AccountInfo: {
              AccountName: '`乂ᴮᴬᴰʙᴏʏ²²乂`',
              AccountLevel: 72,
              AccountRegion: 'PK',
              PrimeLevel: 6,
              AccountLikes: 21403,
              AccountLastLogin: '1794984727',
            },
            AccountProfileInfo: {
              BrRankPoint: 5278,
              CsRankPoint: 141,
            },
            EquippedItemsInfo: {
              EquippedAvatarId: 902026002,
              EquippedBPBadges: 71,
            },
            SocialInfo: {
              accountId: '1922204750',
              signature: 'hera bete masti nai',
            },
            GuildInfo: {
              GuildID: '3104755649',
              GuildName: 'cousins.670',
              GuildLevel: 2,
            },
            ReleaseVersion: 'OB55',
          })
        );
        return;
      }

      if (uid === '1633864660' && region === 'SG') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            result: {
              AccountInfo: {
                AccountName: 'SG_PRO_TEST',
                AccountLevel: 64,
                AccountRegion: 'SG',
                AccountLikes: 980,
              },
              GuildInfo: {
                GuildName: 'SEA_TITANS',
                GuildID: '9918273',
              },
            },
          })
        );
        return;
      }

      if (uid === '9999999999') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Player not found' }));
        return;
      }

      if (uid === '7777777777') {
        res.writeHead(402, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid UID or server error. Please try again.' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    });

    await new Promise<void>((resolve) => {
      providerServer.listen(0, '127.0.0.1', () => {
        const addr = providerServer.address() as AddressInfo;
        providerUrl = `http://127.0.0.1:${addr.port}/ff-info/get`;
        resolve();
      });
    });

    const app = createApp();
    await new Promise<void>((resolve) => {
      appServer = app.listen(0, '127.0.0.1', () => {
        const addr = appServer.address() as AddressInfo;
        appBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    delete process.env.FREEFIRE_API_URL;
    delete process.env.FREEFIRE_API_KEY;
    delete process.env.FREEFIRE_REGION_MAP;
    delete process.env.FREEFIRE_REGION_CASE;
    resetRateLimiter();
    await new Promise<void>((resolve) => appServer.close(() => resolve()));
    await new Promise<void>((resolve) => providerServer.close(() => resolve()));
  });

  it('rejects invalid UIDs before contacting any provider on /api/freefire/lookup', async () => {
    resetRateLimiter();
    const res = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=123&region=PK`);
    const body = (await res.json()) as { ok: boolean; code: string };
    assert.equal(res.status, 400);
    assert.equal(body.ok, false);
    assert.equal(body.code, 'INVALID_UID');
  });

  it('returns clear API_NOT_CONFIGURED error when FREEFIRE_API_URL is unset', async () => {
    resetRateLimiter();
    delete process.env.FREEFIRE_API_URL;
    const res = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    const body = (await res.json()) as { ok: boolean; code: string };
    assert.equal(res.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, 'API_NOT_CONFIGURED');
  });

  it('successfully verifies Pakistan (PK) UID via /api/freefire/lookup with full schema extraction', async () => {
    resetRateLimiter();
    process.env.FREEFIRE_API_URL = providerUrl;
    process.env.FREEFIRE_API_KEY = 'secret-test-key';

    const res = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    const body = (await res.json()) as {
      ok: boolean;
      player: ReturnType<typeof normalizeUpstreamPlayer>;
      diagnostic: { httpStatus: number; mappedRegion: string };
    };

    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.player?.uid, '1922204750');
    assert.equal(body.player?.nickname, '`乂ᴮᴬᴰʙᴏʏ²²乂`');
    assert.equal(body.player?.level, 72);
    assert.equal(body.player?.region, 'PK');
    assert.equal(body.player?.guildName, 'cousins.670');
    assert.equal(body.player?.guildId, '3104755649');
    assert.equal(body.player?.avatarId, '902026002');
    assert.equal(body.player?.badgeCount, 71);
    assert.equal(body.player?.likes, 21403);
    assert.equal(body.player?.signature, 'hera bete masti nai');
    assert.equal(body.player?.lastLoginAt, '1794984727');
    assert.ok(body.player?.extraFields.some((f) => f.label === 'Game Version' && f.value === 'OB55'));
    assert.ok(body.player?.extraFields.some((f) => f.label === 'Prime Level' && f.value === '6'));
    assert.equal(body.diagnostic.httpStatus, 200);
    assert.equal(body.diagnostic.mappedRegion, 'PK');

    const lastReq = seenRequests[seenRequests.length - 1];
    assert.equal(lastReq.headers['x-api-key'], 'secret-test-key');
  });

  it('maps Pakistan (PK) region dynamically via FREEFIRE_REGION_MAP', async () => {
    resetRateLimiter();
    process.env.FREEFIRE_API_URL = providerUrl;
    process.env.FREEFIRE_REGION_MAP = JSON.stringify({ PK: 'pk', GLOBAL: 'SG' });

    const mappedPk = mapRegionForProvider('PK');
    assert.equal(mappedPk.mapped, 'pk');

    const res = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    const body = (await res.json()) as {
      ok: boolean;
      player: { nickname: string };
      diagnostic: { mappedRegion: string };
    };
    assert.equal(res.status, 200);
    assert.equal(body.player.nickname, '`乂ᴮᴬᴰʙᴏʏ²²乂`');
    assert.equal(body.diagnostic.mappedRegion, 'pk');
    delete process.env.FREEFIRE_REGION_MAP;
  });

  it('handles AccountInfo/GuildInfo nested schemas for SG/GLOBAL regions', async () => {
    resetRateLimiter();
    process.env.FREEFIRE_API_URL = providerUrl;
    const res = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1633864660&region=GLOBAL`);
    const body = (await res.json()) as {
      ok: boolean;
      player: { nickname: string; level: number; guildName: string; guildId: string };
      diagnostic: { mappedRegion: string };
    };
    assert.equal(res.status, 200);
    assert.equal(body.player.nickname, 'SG_PRO_TEST');
    assert.equal(body.player.level, 64);
    assert.equal(body.player.guildName, 'SEA_TITANS');
    assert.equal(body.diagnostic.mappedRegion, 'SG');
  });

  it('returns 404 UID_NOT_FOUND for 404, 402 provider error, or empty payloads', async () => {
    resetRateLimiter();
    process.env.FREEFIRE_API_URL = providerUrl;
    const res404 = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=9999999999&region=PK`);
    const body404 = (await res404.json()) as { ok: boolean; code: string };
    assert.equal(res404.status, 404);
    assert.equal(body404.code, 'UID_NOT_FOUND');

    const res402 = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=7777777777&region=PK`);
    const body402 = (await res402.json()) as { ok: boolean; code: string; error: string };
    assert.equal(res402.status, 404);
    assert.equal(body402.code, 'UID_NOT_FOUND');
    assert.match(body402.error, /Invalid UID/i);

    const resEmpty = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=8888888888&region=PK`);
    const bodyEmpty = (await resEmpty.json()) as { ok: boolean; code: string };
    assert.equal(resEmpty.status, 404);
    assert.equal(bodyEmpty.code, 'UID_NOT_FOUND');
  });

  it('reports 401 auth errors, 429 rate limits, 5xx downtime, and non-JSON responses accurately', async () => {
    resetRateLimiter();
    process.env.FREEFIRE_API_URL = `${providerUrl}?mode=auth_fail`;
    const authRes = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    assert.equal(authRes.status, 401);
    assert.equal(((await authRes.json()) as { code: string }).code, 'API_AUTH_ERROR');

    process.env.FREEFIRE_API_URL = `${providerUrl}?mode=rate_limit`;
    const rateRes = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    assert.equal(rateRes.status, 429);
    assert.equal(((await rateRes.json()) as { code: string }).code, 'API_RATE_LIMIT');

    process.env.FREEFIRE_API_URL = `${providerUrl}?mode=downtime`;
    const downRes = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    assert.equal(downRes.status, 502);
    assert.equal(((await downRes.json()) as { code: string }).code, 'PROVIDER_DOWNTIME');

    process.env.FREEFIRE_API_URL = `${providerUrl}?mode=html_error`;
    const htmlRes = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    assert.equal(htmlRes.status, 502);
    assert.equal(((await htmlRes.json()) as { code: string }).code, 'INVALID_RESPONSE_FORMAT');
  });

  it('enforces per-IP rate limiting after 30 requests per minute', async () => {
    resetRateLimiter();
    process.env.FREEFIRE_API_URL = providerUrl;
    for (let i = 0; i < 30; i += 1) {
      const okRes = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
      assert.equal(okRes.status, 200);
    }
    const blockedRes = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    const blockedBody = (await blockedRes.json()) as { ok: boolean; code: string };
    assert.equal(blockedRes.status, 429);
    assert.equal(blockedBody.ok, false);
    assert.equal(blockedBody.code, 'CLIENT_RATE_LIMIT');
    resetRateLimiter();
  });

  it('reports network unavailability and runs live diagnostics probe cleanly', async () => {
    resetRateLimiter();
    process.env.FREEFIRE_API_URL = 'http://127.0.0.1:1/unreachable';
    const failRes = await fetch(`${appBaseUrl}/api/freefire/lookup?uid=1922204750&region=PK`);
    assert.equal(failRes.status, 502);
    assert.equal(((await failRes.json()) as { code: string }).code, 'API_UNAVAILABLE');

    process.env.FREEFIRE_API_URL = providerUrl;
    const diagRes = await fetch(`${appBaseUrl}/api/uid-diagnostics?probe=true&uid=1922204750&region=PK`);
    const diagBody = (await diagRes.json()) as {
      ok: boolean;
      probe: { reachable: boolean; httpStatus: number; topLevelKeys: string[] };
    };
    assert.equal(diagRes.status, 200);
    assert.equal(diagBody.ok, true);
    assert.equal(diagBody.probe.reachable, true);
    assert.equal(diagBody.probe.httpStatus, 200);
    assert.ok(diagBody.probe.topLevelKeys.includes('AccountInfo'));
  });
});
