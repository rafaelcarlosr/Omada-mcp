import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteSslVpnResourceGroupTool } from '../../src/tools/deleteSslVpnResourceGroup.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteSslVpnResourceGroup', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [
            { id: 'g-1', name: 'old', resourcesList: [{ id: 'r-1', name: 'intranet' }] },
            { id: 'resourceGroupLan', name: 'Group_LAN', resourcesList: [{ id: 'resourceGroupLan', name: 'LAN' }] },
        ];
        client = {
            listSslVpnResourceGroups: vi.fn(async () => rows),
            createSslVpnResourceGroup: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updateSslVpnResourceGroup: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteSslVpnResourceGroup: vi.fn((id: string) => {
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
        registerDeleteSslVpnResourceGroupTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.groupId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ groupId: 'g-1' }, {});
        expect(client.deleteSslVpnResourceGroup).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'g-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ groupId: 'g-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteSslVpnResourceGroup).toHaveBeenCalledWith('g-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ groupId: 'missing', dryRun: false }, {})).rejects.toThrow('No SSL VPN resource group with id "missing"');
    });

    it('refuses built-in resource groups', async () => {
        await expect(handler({ groupId: 'resourceGroupLan', dryRun: false }, {})).rejects.toThrow('built-in');
        expect(client.deleteSslVpnResourceGroup).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.deleteSslVpnResourceGroup.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ groupId: 'g-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
