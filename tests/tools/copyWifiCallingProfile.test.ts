import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCopyWifiCallingProfileTool } from '../../src/tools/copyWifiCallingProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const carrierList = [{ carrierName: 'Carrier', epdgs: [{ qosPriority: 1, type: 0, domain: 'epdg.example.com' }] }];

describe('tools/copyWifiCallingProfile', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'wc-1', name: 'voice', description: 'd', carrierList, resource: 0 }];
        client = {
            listWifiCallingProfiles: vi.fn(async () => ({ profileList: rows })),
            copyWifiCallingProfile: vi.fn((id: string, body: { name: string }) => {
                const source = rows.find((row) => row.id === id);
                rows = [...rows, { ...source, id: 'wc-2', name: body.name }];
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCopyWifiCallingProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and name', () => {
        expect(() => definition.inputSchema.profileId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({})).toThrow();
        expect(() => definition.inputSchema.payload.parse({ name: 'x', unexpected: 1 })).toThrow();
    });

    it('previews the copy without writing', async () => {
        const result = await handler({ profileId: 'wc-1', payload: { name: 'voice-copy' } }, {});
        expect(client.copyWifiCallingProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({
            status: 'planned',
            result: { dryRun: true, planned: { name: 'voice-copy', description: 'd', carrierList } },
        });
    });

    it('copies once and verifies the new profile carries the carriers', async () => {
        const result = await handler({ profileId: 'wc-1', payload: { name: 'voice-copy' }, siteId: 'site-1', dryRun: false }, {});
        expect(client.copyWifiCallingProfile).toHaveBeenCalledWith('wc-1', { name: 'voice-copy' }, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'wc-2' } });
    });

    it('refuses an unknown source or a taken name', async () => {
        await expect(handler({ profileId: 'missing', payload: { name: 'x' }, dryRun: false }, {})).rejects.toThrow(
            'No Wi-Fi calling profile with id "missing"'
        );
        await expect(handler({ profileId: 'wc-1', payload: { name: 'voice' }, dryRun: false }, {})).rejects.toThrow('already exists');
        expect(client.copyWifiCallingProfile).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.copyWifiCallingProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ profileId: 'wc-1', payload: { name: 'voice-copy' }, dryRun: false }, {})).rejects.toThrow(
            '(errorCode -1001): rejected'
        );
    });
});
