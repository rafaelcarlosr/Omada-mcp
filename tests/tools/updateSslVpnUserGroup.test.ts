import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateSslVpnUserGroupTool } from '../../src/tools/updateSslVpnUserGroup.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { resourceGroupList: ['resourceGroupLan', 'g-2'] };

describe('tools/updateSslVpnUserGroup', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'ug-1', name: 'old', resourceGroupList: [{ id: 'g-1', name: 'apps' }], userList: [], userNumber: 0 }];
        client = {
            listSslVpnUserGroups: vi.fn(async () => rows),
            createSslVpnUserGroup: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updateSslVpnUserGroup: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteSslVpnUserGroup: vi.fn((id: string) => {
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
        registerUpdateSslVpnUserGroupTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.groupId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ groupId: 'ug-1', payload }, {});
        expect(client.updateSslVpnUserGroup).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'ug-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ groupId: 'ug-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateSslVpnUserGroup).toHaveBeenCalledWith('ug-1', { resourceGroupList: ['g-2', 'resourceGroupLan'] }, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ groupId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No SSL VPN user group with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updateSslVpnUserGroup.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ groupId: 'ug-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
