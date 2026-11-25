import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdatePoeScheduleTool } from '../../src/tools/updatePoeSchedule.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'night-off-2', status: false, turnOnTime: 'tr-2', poePortsMap: {} };

describe('tools/updatePoeSchedule', () => {
    it('refuses a port missing from the port overview before sending', async () => {
        const bad = { ...payload, poePortsMap: { 'AA-BB-CC-DD-EE-02': [1] } };
        await expect(handler({ poeScheduleId: 'poe-1', payload: bad, dryRun: false }, {})).rejects.toThrow(
            "port 1 on switch AA-BB-CC-DD-EE-02 is not in this site's switch port overview"
        );
        expect(client.updatePoeSchedule).not.toHaveBeenCalled();
    });

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
        registerUpdatePoeScheduleTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.poeScheduleId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ poeScheduleId: 'poe-1', payload }, {});
        expect(client.updatePoeSchedule).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'poe-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ poeScheduleId: 'poe-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updatePoeSchedule).toHaveBeenCalledWith('poe-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ poeScheduleId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No PoE schedule with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updatePoeSchedule.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ poeScheduleId: 'poe-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
