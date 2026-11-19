import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetSsidConfigTool } from '../../src/tools/setSsidConfig.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setSsidConfig', () => {
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
        registerSetSsidConfigTool(server, client as unknown as OmadaClient);
    });

    it('previews, then disables the SSID and verifies, warning about clients', async () => {
        const preview = await handler({ ssidId: 'x1', configType: 'enable', changes: { ssidEnable: false } }, {});
        expect(preview.structuredContent).toMatchObject({
            status: 'planned',
            result: { before: { ssidEnable: true }, warnings: [expect.stringContaining('disconnects all')] },
        });
        const result = await handler({ ssidId: 'x1', configType: 'enable', changes: { ssidEnable: false }, dryRun: false }, {});
        expect(client.setSsidSection).toHaveBeenCalledWith('x1', 'enable', { ssidEnable: false }, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('merges a partial section with the current values', async () => {
        await handler({ ssidId: 'x1', configType: 'multicast-config', changes: { channelUtil: 90 }, dryRun: false }, {});
        expect(client.setSsidSection).toHaveBeenCalledWith(
            'x1',
            'multicast-config',
            { multiCastEnable: true, channelUtil: 90, arpCastEnable: false, ipv6CastEnable: true, filterEnable: false },
            undefined,
            undefined
        );
    });

    it('sends rate control through the SSID WLAN group', async () => {
        const result = await handler(
            { ssidId: 'x1', configType: 'rate-control', changes: { rate2gCtrlEnable: false, rate6gCtrlEnable: true }, dryRun: false },
            {}
        );
        expect(client.setSsidRateControl).toHaveBeenCalledWith(
            'w1',
            'x1',
            { rate2gCtrlEnable: false, rate5gCtrlEnable: false, rate6gCtrlEnable: true },
            undefined,
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
        await expect(handler({ ssidId: 'x1', configType: 'rate-control', changes: { rate5gCtrlEnable: true }, dryRun: false }, {})).rejects.toThrow(
            'rate5gCtrlEnable: true also needs'
        );
        client.listAllSsids.mockResolvedValueOnce([]);
        await expect(handler({ ssidId: 'x1', configType: 'rate-control', changes: { rate2gCtrlEnable: false }, dryRun: false }, {})).rejects.toThrow(
            'No SSID with id "x1"'
        );
        expect(client.setSsidRateControl).toHaveBeenCalledTimes(1);
    });

    it('reports Hotspot 2.0 as not verifiable and refuses invalid changes', async () => {
        client.setSsidSection.mockRejectedValueOnce(new OmadaApiError(-33263, 'not supported'));
        await expect(handler({ ssidId: 'x1', configType: 'hotspotv2', changes: { hotspotV2Enable: false }, dryRun: false }, {})).rejects.toThrow(
            '(errorCode -33263)'
        );
        expect(
            (await handler({ ssidId: 'x1', configType: 'hotspotv2', changes: { hotspotV2Enable: false }, dryRun: false }, {})).structuredContent
        ).toMatchObject({
            result: { notVerifiedFields: ['hotspotV2Enable'] },
        });
        await expect(handler({ ssidId: 'x1', configType: 'enable', changes: { bogus: 1 } }, {})).rejects.toThrow();
        await expect(handler({ ssidId: 'x1', configType: 'band-steer', changes: { mode: 'x' } }, {})).rejects.toThrow();
        expect(() => definition.inputSchema.changes.parse({})).toThrow('At least one change is required.');
    });
});
