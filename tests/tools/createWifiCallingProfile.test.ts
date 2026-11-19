import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateWifiCallingProfileTool } from '../../src/tools/createWifiCallingProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = {
    name: 'voice',
    description: 'carriers',
    carrierList: [{ carrierName: 'Carrier', epdgs: [{ qosPriority: 1, type: 0, domain: 'epdg.example.com' }] }],
};

describe('tools/createWifiCallingProfile', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'wc-1', name: 'old', carrierList: [], resource: 0 }];
        client = {
            listWifiCallingProfiles: vi.fn(async () => ({ profileList: rows })),
            createWifiCallingProfile: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve('new-1');
            }),
            updateWifiCallingProfile: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteWifiCallingProfile: vi.fn((id: string) => {
                rows = rows.filter((row) => row.id !== id);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCreateWifiCallingProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews by default without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.createWifiCallingProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true } });
    });

    it('creates once and verifies the readback', async () => {
        const result = await handler({ payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.createWifiCallingProfile).toHaveBeenCalledTimes(1);
        expect(client.createWifiCallingProfile).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'new-1' } });
    });

    it('refuses a duplicate name', async () => {
        await expect(
            handler(
                {
                    payload: {
                        name: 'old',
                        description: 'carriers',
                        carrierList: [{ carrierName: 'Carrier', epdgs: [{ qosPriority: 1, type: 0, domain: 'epdg.example.com' }] }],
                    },
                    dryRun: false,
                },
                {}
            )
        ).rejects.toThrow('already exists');
        expect(client.createWifiCallingProfile).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.createWifiCallingProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
