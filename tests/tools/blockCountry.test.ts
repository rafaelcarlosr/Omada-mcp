import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerBlockCountryTool } from '../../src/tools/blockCountry.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/blockCountry', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let wids: Record<string, unknown>;
    let wips: Record<string, unknown>;
    let allow: Record<string, unknown>[];
    let blocks: Record<string, unknown>[];
    let signatures: Record<string, unknown>[];
    let blocked: Record<string, string[]>;

    beforeEach(() => {
        wids = { status: true, level: 1 };
        wips = { status: false };
        allow = [{ id: 'a1', direction: 0, trafficType: 0, trafficSource: '10.0.0.1' }];
        blocks = [{ id: 'b1', trafficSource: '10.0.0.9' }];
        signatures = [{ id: 'g1', type: 0 }];
        blocked = { s1: [], s2: ['KP'] };
        const page = (rows: Record<string, unknown>[]) => ({ data: rows, totalRows: rows.length });
        client = {
            getWirelessIdsConfig: vi.fn(async () => wids),
            setWirelessIdsConfig: vi.fn((body: Record<string, unknown>) => {
                wids = body.status ? body : { ...wids, status: false };
                return Promise.resolve(undefined);
            }),
            getWirelessIpsConfig: vi.fn(async () => wips),
            setWirelessIpsConfig: vi.fn((body: Record<string, unknown>) => {
                wips = body;
                return Promise.resolve(undefined);
            }),
            getGridAllowList: vi.fn(async () => page(allow)),
            createIpsAllowEntry: vi.fn((body: Record<string, unknown>) => {
                allow = [
                    ...allow,
                    {
                        id: 'a2',
                        direction: body.direction,
                        trafficType: body.trafficType,
                        trafficSource: body.ipAddress ?? body.network ?? body.subnet,
                    },
                ];
                return Promise.resolve(undefined);
            }),
            updateIpsAllowEntry: vi.fn((body: Record<string, unknown>) => {
                allow = allow.map((entry) =>
                    entry.id === body.id
                        ? {
                              id: body.id,
                              direction: body.direction,
                              trafficType: body.trafficType,
                              trafficSource: body.ipAddress ?? body.network ?? body.subnet,
                          }
                        : entry
                );
                return Promise.resolve(undefined);
            }),
            deleteIpsAllowEntry: vi.fn((id: string) => {
                allow = allow.filter((entry) => entry.id !== id);
                return Promise.resolve(undefined);
            }),
            getGridBlockList: vi.fn(async () => page(blocks)),
            deleteIpsBlockEntry: vi.fn((id: string) => {
                blocks = blocks.filter((entry) => entry.id !== id);
                return Promise.resolve(undefined);
            }),
            getGridSignature: vi.fn(async () => page(signatures)),
            updateIpsSignature: vi.fn((id: string, body: Record<string, unknown>) => {
                signatures = signatures.map((entry) => (entry.id === id ? { ...entry, ...body } : entry));
                return Promise.resolve(undefined);
            }),
            deleteIpsSignature: vi.fn((id: string) => {
                signatures = signatures.filter((entry) => entry.id !== id);
                return Promise.resolve(undefined);
            }),
            listBlockedCountries: vi.fn(async (sites: string[]) => ({ countries: blocked[sites[0]] ?? [] })),
            blockCountry: vi.fn((country: string, sites: string[]) => {
                for (const site of sites) blocked[site] = [...(blocked[site] ?? []), country];
                return Promise.resolve(undefined);
            }),
            unblockCountry: vi.fn((country: string, sites: string[]) => {
                for (const site of sites) blocked[site] = (blocked[site] ?? []).filter((code) => code !== country);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerBlockCountryTool(server, client as unknown as OmadaClient);
    });

    it('previews each site, then blocks and verifies per site', async () => {
        expect((await handler({ country: 'KP', siteIds: ['s1', 's2'] }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { before: { s1: false, s2: true } },
        });
        const result = await handler({ country: 'KP', siteIds: ['s1', 's2', 's1'], dryRun: false }, {});
        expect(client.blockCountry).toHaveBeenCalledWith('KP', ['s1', 's2'], undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('validates the country code and surfaces rejections', async () => {
        expect(() => definition.inputSchema.country.parse('korea')).toThrow();
        client.listBlockedCountries.mockResolvedValueOnce(undefined);
        client.blockCountry.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ country: 'CN', siteIds: ['s1'], dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
    });
});
