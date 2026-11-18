import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteSslVpnResourceTool } from '../../src/tools/deleteSslVpnResource.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteSslVpnResource', () => {
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
        registerDeleteSslVpnResourceTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.resourceId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ resourceId: 'r-1' }, {});
        expect(client.deleteSslVpnResource).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'r-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ resourceId: 'r-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteSslVpnResource).toHaveBeenCalledWith('r-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ resourceId: 'missing', dryRun: false }, {})).rejects.toThrow('No SSL VPN resource with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.deleteSslVpnResource.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ resourceId: 'r-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
