import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdatePpskProfileTool } from '../../src/tools/updatePpskProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const portal = {
    name: 'guest',
    enable: true,
    ssidList: [],
    networkList: ['n1'],
    authType: 0,
    authTimeout: { customTimeout: 2, customTimeoutUnit: 2 },
    httpsRedirectEnable: false,
    landingPage: 1,
};

describe('tools/updatePpskProfile', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let portals: Record<string, Record<string, unknown>>;
    let profiles: Record<string, Record<string, unknown>>;

    beforeEach(() => {
        portals = { p1: { id: 'p1', ...portal, authTimeout: { authTimeout: 0, customTimeout: 2, customTimeoutUnit: 2 } } };
        profiles = {
            k1: {
                id: 'k1',
                profileName: 'staff',
                ssid: [],
                ppsk: [{ name: 'alice', psk: 'labpsk12345', vlan: 10 }],
                type: 0,
                rateLimit: { downLimitEnable: false, upLimitEnable: false },
                expiration: { type: 0 },
            },
        };
        client = {
            getPortalProfile: vi.fn(async () => Object.values(portals).map(({ id, name }) => ({ id, name }))),
            getPortal: vi.fn(async (id: string) => portals[id]),
            getPortalCustomization: vi.fn(async () => ({ pageType: 1, portalCustomize: { logoDisplay: true } })),
            createPortal: vi.fn((body: Record<string, unknown>) => {
                portals.p2 = body.enable ? { id: 'p2', ...body } : { id: 'p2', name: body.name, enable: false, authType: 0 };
                return Promise.resolve('p2');
            }),
            updatePortal: vi.fn((id: string, body: Record<string, unknown>) => {
                portals[id] = { id, ...body };
                return Promise.resolve(undefined);
            }),
            deletePortal: vi.fn((id: string) => {
                delete portals[id];
                return Promise.resolve(undefined);
            }),
            getPPSKProfiles: vi.fn(async () => Object.values(profiles).map(({ id, profileName }) => ({ id, profileName, ssid: [] }))),
            getPpskUserGroup: vi.fn(async (id: string) => profiles[id]),
            createPpskProfile: vi.fn((body: Record<string, unknown>) => {
                profiles.k2 = { id: 'k2', profileName: body.profileName, ppsk: body.ppsk ?? [{ name: 'dev_1', psk: 'x' }] };
                return Promise.resolve({ id: 'k2' });
            }),
            updatePpskProfile: vi.fn((id: string, body: Record<string, unknown>) => {
                profiles[id] = { ...profiles[id], ...body };
                return Promise.resolve(undefined);
            }),
            deletePpskProfile: vi.fn((id: string) => {
                delete profiles[id];
                return Promise.resolve(undefined);
            }),
            addPpskEntries: vi.fn((id: string, body: { ppskList: Record<string, unknown>[] }) => {
                profiles[id] = { ...profiles[id], ppsk: [...(profiles[id].ppsk as unknown[]), ...body.ppskList] };
                return Promise.resolve(undefined);
            }),
            deletePpskEntries: vi.fn((id: string, names: string[]) => {
                profiles[id] = { ...profiles[id], ppsk: (profiles[id].ppsk as { name: string }[]).filter((entry) => !names.includes(entry.name)) };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerUpdatePpskProfileTool(server, client as unknown as OmadaClient);
    });

    it('renames the profile, keeping its PSKs, and verifies', async () => {
        const result = await handler({ profileId: 'k1', changes: { profileName: 'staff2' }, dryRun: false }, {});
        expect(client.updatePpskProfile).toHaveBeenCalledWith(
            'k1',
            expect.objectContaining({ profileName: 'staff2', ppsk: [{ name: 'alice', psk: 'labpsk12345', vlan: 10 }] }),
            undefined,
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown profiles and empty changes', async () => {
        await expect(handler({ profileId: 'zz', changes: { profileName: 'x' }, dryRun: false }, {})).rejects.toThrow('No PPSK profile with id "zz"');
        expect(() => definition.inputSchema.changes.parse({})).toThrow('At least one change is required.');
    });
});
