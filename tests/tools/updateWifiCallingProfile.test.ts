import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateWifiCallingProfileTool } from '../../src/tools/updateWifiCallingProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'voice-2', carrierList: [{ carrierName: 'Other', epdgs: [{ qosPriority: 2, type: 1, ip: '192.0.2.1' }] }] };

describe('tools/updateWifiCallingProfile', () => {
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
        registerUpdateWifiCallingProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.profileId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ profileId: 'wc-1', payload }, {});
        expect(client.updateWifiCallingProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'wc-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ profileId: 'wc-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateWifiCallingProfile).toHaveBeenCalledWith('wc-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ profileId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No Wi-Fi calling profile with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updateWifiCallingProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ profileId: 'wc-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
