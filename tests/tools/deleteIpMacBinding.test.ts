import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteIpMacBindingTool } from '../../src/tools/deleteIpMacBinding.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteIpMacBinding', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'ipm-1', ip: '192.168.0.9', mac: 'AA-BB-CC-00-11-20', status: true, interfaceType: 1, interfaceId: 'lan-1' }];
        client = {
            getGridIpMacBinding: vi.fn(async () => rows),
            createIpMacBinding: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve('new-1');
            }),
            updateIpMacBinding: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteIpMacBinding: vi.fn((id: string) => {
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
        registerDeleteIpMacBindingTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.bindId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ bindId: 'ipm-1' }, {});
        expect(client.deleteIpMacBinding).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'ipm-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ bindId: 'ipm-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteIpMacBinding).toHaveBeenCalledWith('ipm-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ bindId: 'missing', dryRun: false }, {})).rejects.toThrow('No IP-MAC binding with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.deleteIpMacBinding.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ bindId: 'ipm-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
