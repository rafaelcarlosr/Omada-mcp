import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteApGroupTool } from '../../src/tools/deleteApGroup.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteApGroup', () => {
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
        registerDeleteApGroupTool(server, client as unknown as OmadaClient);
    });

    it('previews, then deletes and verifies it is gone', async () => {
        expect((await handler({ apGroupId: 'g1' }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ apGroupId: 'g1', dryRun: false }, {});
        expect(client.deleteApGroup).toHaveBeenCalledWith('g1', undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses the default group and unknown groups', async () => {
        await expect(handler({ apGroupId: 'g0', dryRun: false }, {})).rejects.toThrow('default AP group');
        await expect(handler({ apGroupId: 'zz', dryRun: false }, {})).rejects.toThrow('No AP group with id "zz"');
        expect(client.deleteApGroup).not.toHaveBeenCalled();
        expect(definition.inputSchema.apGroupId).toBeTruthy();
    });
});
