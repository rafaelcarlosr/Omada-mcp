import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetSsidApGroupsTool } from '../../src/tools/setSsidApGroups.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setSsidApGroups', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let groups: Record<string, unknown>[];
    let ssid: Record<string, unknown>;
    let bound: string[];

    beforeEach(() => {
        groups = [
            { id: 'g0', name: 'Default', primary: true, apNum: 0 },
            { id: 'g1', name: 'lobby', primary: false, apNum: 1 },
        ];
        bound = ['g0'];
        ssid = {
            id: 'x1',
            ssidEnable: true,
            bandSteer: { mode: 3 },
            multiCast: { multiCastEnable: true, channelUtil: 100, arpCastEnable: false, ipv6CastEnable: true, filterEnable: false },
            rateControl: { rate2gCtrlEnable: false, rate5gCtrlEnable: false, rate6gCtrlEnable: false },
            pskSetting: { securityKey: 'not-a-real-key' },
        };
        client = {
            listApGroups: vi.fn(async () => groups),
            createApGroup: vi.fn((body: Record<string, unknown>) => {
                groups = [...groups, { id: 'g2', name: body.name, primary: false }];
                return Promise.resolve({ id: 'g2' });
            }),
            updateApGroup: vi.fn((id: string, body: Record<string, unknown>) => {
                groups = groups.map((group) => (group.id === id ? { ...group, name: body.name } : group));
                return Promise.resolve(undefined);
            }),
            deleteApGroup: vi.fn((id: string) => {
                groups = groups.filter((group) => group.id !== id);
                return Promise.resolve(undefined);
            }),
            listSsidApGroups: vi.fn(async () => ({ apGroups: bound.map((id) => ({ id })) })),
            setSsidApGroups: vi.fn((_ssidId: string, ids: string[]) => {
                bound = ids;
                return Promise.resolve(undefined);
            }),
            getSsidConfig: vi.fn(async () => ssid),
            setSsidSection: vi.fn((_id: string, section: string, body: Record<string, unknown>) => {
                if (section === 'enable') ssid = { ...ssid, ...body };
                if (section === 'multicast-config') ssid = { ...ssid, multiCast: body };
                return Promise.resolve(undefined);
            }),
            setSsidRateControl: vi.fn((_wlanId: string, _id: string, body: Record<string, unknown>) => {
                ssid = { ...ssid, rateControl: body };
                return Promise.resolve(undefined);
            }),
            listAllSsids: vi.fn(async () => [{ ssidId: 'x1', wlanId: 'w1' }]),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetSsidApGroupsTool(server, client as unknown as OmadaClient);
    });

    it('previews, then sets the de-duplicated sorted groups and verifies', async () => {
        expect((await handler({ ssidId: 'x1', apGroupIds: ['g1', 'g0'] }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { before: { apGroupIds: ['g0'] } },
        });
        const result = await handler({ ssidId: 'x1', apGroupIds: ['g1', 'g0', 'g1'], dryRun: false }, {});
        expect(client.setSsidApGroups).toHaveBeenCalledWith('x1', ['g0', 'g1'], undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown groups and an unreadable binding', async () => {
        await expect(handler({ ssidId: 'x1', apGroupIds: ['zz'], dryRun: false }, {})).rejects.toThrow('No AP group with id zz');
        client.listSsidApGroups.mockResolvedValueOnce(undefined);
        await expect(handler({ ssidId: 'x1', apGroupIds: ['g0'] }, {})).rejects.toThrow('current state cannot be established');
        expect(() => definition.inputSchema.apGroupIds.parse([])).toThrow();
    });
});
