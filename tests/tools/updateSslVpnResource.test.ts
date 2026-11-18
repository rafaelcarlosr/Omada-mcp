import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateSslVpnResourceTool } from '../../src/tools/updateSslVpnResource.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { type: 0, ip: '192.168.51.0', mask: '24', protocol: 0 };

describe('tools/updateSslVpnResource', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'r-1', name: 'old', type: 0, ip: '10.0.0.0', mask: '8', protocol: 0, resourceGroupList: [] }];
        client = {
            listSslVpnResources: vi.fn(async () => rows),
            createSslVpnResource: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updateSslVpnResource: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteSslVpnResource: vi.fn((id: string) => {
                rows = rows.filter((row) => row.id !== id);
                return Promise.resolve({});
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerUpdateSslVpnResourceTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.resourceId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ resourceId: 'r-1', payload }, {});
        expect(client.updateSslVpnResource).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'r-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ resourceId: 'r-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateSslVpnResource).toHaveBeenCalledWith('r-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ resourceId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No SSL VPN resource with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updateSslVpnResource.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ resourceId: 'r-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
