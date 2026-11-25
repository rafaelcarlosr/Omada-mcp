import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreatePoeScheduleTool } from '../../src/tools/createPoeSchedule.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'night-off', status: true, turnOnTime: 'tr-1', poePortsMap: { 'AA-BB-CC-DD-EE-01': [2, 3] } };

describe('tools/createPoeSchedule', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'poe-1', name: 'old', status: false, turnOnTime: 'tr-1', poePortsMap: {} }];
        client = {
            listSwitchPortOverview: vi.fn(async () => [
                { switchMac: 'AA-BB-CC-DD-EE-01', port: 2, supportPoe: true },
                { switchMac: 'AA-BB-CC-DD-EE-01', port: 3, supportPoe: true },
                { switchMac: 'AA-BB-CC-DD-EE-01', port: 5, supportPoe: false },
            ]),
            listPoeSchedules: vi.fn(async () => rows),
            createPoeSchedule: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve('new-1');
            }),
            updatePoeSchedule: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deletePoeSchedule: vi.fn((id: string) => {
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
        registerCreatePoeScheduleTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews by default without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.createPoeSchedule).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true } });
    });

    it('creates once and verifies the readback', async () => {
        const result = await handler({ payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.createPoeSchedule).toHaveBeenCalledTimes(1);
        expect(client.createPoeSchedule).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'new-1' } });
    });

    it('refuses a duplicate name', async () => {
        await expect(
            handler({ payload: { name: 'old', status: true, turnOnTime: 'tr-1', poePortsMap: { 'AA-BB-CC-DD-EE-01': [2, 3] } }, dryRun: false }, {})
        ).rejects.toThrow('already exists');
        expect(client.createPoeSchedule).not.toHaveBeenCalled();
    });

    it('refuses a port without PoE before sending, even in preview', async () => {
        const bad = { ...payload, poePortsMap: { 'aa:bb:cc:dd:ee:01': [2, 5] } };
        await expect(handler({ payload: bad }, {})).rejects.toThrow('port 5 on switch aa:bb:cc:dd:ee:01 does not supply PoE');
        await expect(handler({ payload: bad, dryRun: false }, {})).rejects.toThrow('No request was sent');
        expect(client.createPoeSchedule).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.createPoeSchedule.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
