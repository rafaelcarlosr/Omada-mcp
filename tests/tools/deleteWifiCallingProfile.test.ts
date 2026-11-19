import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteWifiCallingProfileTool } from '../../src/tools/deleteWifiCallingProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteWifiCallingProfile', () => {
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
        registerDeleteWifiCallingProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.profileId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ profileId: 'wc-1' }, {});
        expect(client.deleteWifiCallingProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'wc-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ profileId: 'wc-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteWifiCallingProfile).toHaveBeenCalledWith('wc-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ profileId: 'missing', dryRun: false }, {})).rejects.toThrow('No Wi-Fi calling profile with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.deleteWifiCallingProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ profileId: 'wc-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
