import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeletePortScheduleTool } from '../../src/tools/deletePortSchedule.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deletePortSchedule', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let schedules: Record<string, unknown>[];

    beforeEach(() => {
        schedules = [{ id: 'ps-1', name: 'day', status: false, turnOnTime: 'tr-1', portsMap: {} }];
        client = {
            listPortSchedules: vi.fn(async () => schedules),
            createPortSchedule: vi.fn((body: Record<string, unknown>) => {
                schedules = [...schedules, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updatePortSchedule: vi.fn((id: string, body: Record<string, unknown>) => {
                schedules = schedules.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deletePortSchedule: vi.fn((id: string) => {
                schedules = schedules.filter((row) => row.id !== id);
                return Promise.resolve({});
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeletePortScheduleTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.scheduleId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ scheduleId: 'ps-1' }, {});
        expect(client.deletePortSchedule).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'ps-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ scheduleId: 'ps-1', dryRun: false }, {});
        expect(client.deletePortSchedule).toHaveBeenCalledWith('ps-1', undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('surfaces controller rejections', async () => {
        client.deletePortSchedule.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ scheduleId: 'ps-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
