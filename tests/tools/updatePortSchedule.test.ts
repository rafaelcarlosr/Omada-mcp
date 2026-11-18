import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdatePortScheduleTool } from '../../src/tools/updatePortSchedule.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'nightly', status: true, turnOnTime: 'tr-1', portsMap: { 'AA-BB-CC-DD-EE-FF': [1, 2] } };

describe('tools/updatePortSchedule', () => {
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
        registerUpdatePortScheduleTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.scheduleId.parse(' ')).toThrow();
    });

    it('previews the difference without writing', async () => {
        const result = await handler({ scheduleId: 'ps-1', payload: payload }, {});
        expect(client.updatePortSchedule).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'ps-1', alreadyMatches: false } });
    });

    it('applies once and verifies the readback', async () => {
        const result = await handler({ scheduleId: 'ps-1', payload: payload, dryRun: false }, {});
        expect(client.updatePortSchedule).toHaveBeenCalledWith('ps-1', payload, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ scheduleId: 'missing', payload: payload }, {})).rejects.toThrow('"missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updatePortSchedule.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ scheduleId: 'ps-1', payload: payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
