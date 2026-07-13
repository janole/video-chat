import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("peer config", () =>
{
    beforeEach(() =>
    {
        vi.resetModules();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-13T12:00:00.000Z"));
    });

    afterEach(() =>
    {
        vi.unstubAllEnvs();
        vi.useRealTimers();
    });

    it("generates time-limited HMAC-SHA1 credentials", async () =>
    {
        const { getCredentials } = await import("../peer-config.js");
        const expires = Math.floor(Date.now() / 1_000) + 24 * 3_600;
        const username = `${expires}:example-room`;
        const credential = createHmac("sha1", "turn-secret").update(username).digest("base64");

        expect(getCredentials("example-room", "turn-secret")).toEqual({ credential, username });
    });

    it("returns fresh configs and adds credentials only to TURN servers", async () =>
    {
        vi.stubEnv("TURN_SERVERS", "turn:one.example,turns:two.example");
        vi.stubEnv("STUN_SERVERS", "stun:stun.example");
        const { getPeerConfig, peerConfig } = await import("../peer-config.js");

        const first = getPeerConfig("room", "secret");
        const second = getPeerConfig("room", "secret");

        expect(first).not.toBe(second);
        expect(first.PEER_ICE_SERVERS).not.toBe(second.PEER_ICE_SERVERS);
        expect(first.PEER_ICE_SERVERS[0]).not.toBe(second.PEER_ICE_SERVERS[0]);
        expect(first.PEER_ICE_SERVERS[0]).toMatchObject({ username: expect.stringMatching(/:room$/), credential: expect.any(String) });
        expect(first.PEER_ICE_SERVERS[1]).toEqual({ urls: ["stun:stun.example"] });
        expect(peerConfig.PEER_ICE_SERVERS).toEqual([
            { urls: ["turn:one.example", "turns:two.example"] },
            { urls: ["stun:stun.example"] },
        ]);
    });

    it("omits credentials when TURN_SECRET is unavailable", async () =>
    {
        vi.stubEnv("TURN_SERVERS", "turn:turn.example");
        vi.stubEnv("STUN_SERVERS", "stun:stun.example");
        const { getCredentials, getPeerConfig } = await import("../peer-config.js");

        expect(getCredentials("room", undefined)).toEqual({});
        expect(getPeerConfig("room", undefined).PEER_ICE_SERVERS).toEqual([
            { urls: ["turn:turn.example"] },
            { urls: ["stun:stun.example"] },
        ]);
    });
});
