import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateIpMacBindingTool } from '../../src/tools/updateIpMacBinding.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = {
    ip: '192.168.0.51',
    mac: 'AA-BB-CC-00-11-24',
    status: false,
    interfaceType: 1,
    interfaceId: 'lan-1',
    enableExportToDhcpReservation: false,
};

describe('tools/updateIpMacBinding', () => {
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
        registerUpdateIpMacBindingTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.bindId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ bindId: 'ipm-1', payload }, {});
        expect(client.updateIpMacBinding).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'ipm-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ bindId: 'ipm-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateIpMacBinding).toHaveBeenCalledWith('ipm-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ bindId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No IP-MAC binding with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updateIpMacBinding.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ bindId: 'ipm-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
