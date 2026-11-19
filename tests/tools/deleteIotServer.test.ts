import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteIotServerTool } from '../../src/tools/deleteIotServer.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteIotServer', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [
            {
                id: 'iot-1',
                name: 'old',
                enable: false,
                serverUrl: 'http://192.0.2.9/iot',
                serverType: 0,
                deviceClasses: [1],
                authentication: 0,
                rssiFormat: 0,
                blePeriodicTelemetry: false,
                rawData: false,
            },
        ];
        client = {
            listIotServers: vi.fn(async () => rows),
            createIotServer: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve('new-1');
            }),
            updateIotServer: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteIotServer: vi.fn((id: string) => {
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
        registerDeleteIotServerTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.iotServerId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ iotServerId: 'iot-1' }, {});
        expect(client.deleteIotServer).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'iot-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ iotServerId: 'iot-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteIotServer).toHaveBeenCalledWith('iot-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ iotServerId: 'missing', dryRun: false }, {})).rejects.toThrow('No IoT transport stream with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.deleteIotServer.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ iotServerId: 'iot-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
