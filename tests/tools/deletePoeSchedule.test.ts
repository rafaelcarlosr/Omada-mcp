import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeletePoeScheduleTool } from '../../src/tools/deletePoeSchedule.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deletePoeSchedule', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'poe-1', name: 'old', status: false, turnOnTime: 'tr-1', poePortsMap: {} }];
        client = {
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
        registerDeletePoeScheduleTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.poeScheduleId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ poeScheduleId: 'poe-1' }, {});
        expect(client.deletePoeSchedule).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'poe-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ poeScheduleId: 'poe-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deletePoeSchedule).toHaveBeenCalledWith('poe-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ poeScheduleId: 'missing', dryRun: false }, {})).rejects.toThrow('No PoE schedule with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.deletePoeSchedule.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ poeScheduleId: 'poe-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
