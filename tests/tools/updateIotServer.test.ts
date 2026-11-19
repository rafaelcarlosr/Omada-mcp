import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateIotServerTool } from '../../src/tools/updateIotServer.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = {
    name: 'beacons-2',
    enable: false,
    serverUrl: 'http://192.0.2.11/iot',
    serverType: 0,
    deviceClasses: [1, 2],
    reportInterval: 30,
    authentication: 0,
    accessToken: 'tok654321',
    clientId: 'cid2',
    rssiFormat: 1,
    blePeriodicTelemetry: false,
    rawData: false,
};

describe('tools/updateIotServer', () => {
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
        registerUpdateIotServerTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.iotServerId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ iotServerId: 'iot-1', payload }, {});
        expect(client.updateIotServer).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'iot-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ iotServerId: 'iot-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateIotServer).toHaveBeenCalledWith('iot-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ iotServerId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No IoT transport stream with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updateIotServer.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ iotServerId: 'iot-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
