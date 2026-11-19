import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateMdnsProfileTool } from '../../src/tools/updateMdnsProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'printers-2', serviceIds: ['_ipps._tcp.local'] };

describe('tools/updateMdnsProfile', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [
            { id: 'bj-1', name: 'old', serviceIds: ['_old._tcp.local'], defaultProfile: false },
            { id: 'buildIn-1', name: 'AirPlay', serviceIds: ['_airplay._tcp.local'], defaultProfile: true },
        ];
        client = {
            listMdnsProfile: vi.fn(async () => rows),
            createMdnsProfile: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve('new-1');
            }),
            updateMdnsProfile: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteMdnsProfile: vi.fn((id: string) => {
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
        registerUpdateMdnsProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.profileId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ profileId: 'bj-1', payload }, {});
        expect(client.updateMdnsProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'bj-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ profileId: 'bj-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateMdnsProfile).toHaveBeenCalledWith('bj-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ profileId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No Bonjour service with id "missing"');
    });

    it('refuses built-in profiles', async () => {
        await expect(handler({ profileId: 'buildIn-1', payload, dryRun: false }, {})).rejects.toThrow('built-in');
        expect(client.updateMdnsProfile).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.updateMdnsProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ profileId: 'bj-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
