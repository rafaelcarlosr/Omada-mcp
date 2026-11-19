import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteExpiredAuthedRecordsTool } from '../../src/tools/deleteExpiredAuthedRecords.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteExpiredAuthedRecords', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let records: Record<string, unknown>[];

    beforeEach(() => {
        records = [{ id: 'a-1', clientMac: 'AA-BB-CC-DD-EE-01' }];
        client = {
            listHotspotAuthRecords: vi.fn(async () => records),
            deleteAuthedRecord: vi.fn((id: string) => {
                records = records.filter((record) => record.id !== id);
                return Promise.resolve(undefined);
            }),
            extendAuthedRecord: vi.fn(async () => undefined),
            deleteExpiredAuthedRecords: vi.fn(async () => undefined),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteExpiredAuthedRecordsTool(server, client as unknown as OmadaClient);
    });

    it('validates the period', () => {
        expect(() => definition.inputSchema.payload.parse({ start: 200, end: 100 })).toThrow('start must be before end.');
    });

    it('previews the filter, then deletes', async () => {
        const payload = { start: 100, end: 200, searchKey: 'guest' };
        expect((await handler({ payload }, {})).structuredContent).toMatchObject({ status: 'planned', result: { target: payload } });
        await handler({ payload, dryRun: false }, {});
        expect(client.deleteExpiredAuthedRecords).toHaveBeenCalledWith(payload, undefined, undefined);
        expect(records).toHaveLength(1);
    });

    it('surfaces rejections', async () => {
        client.deleteExpiredAuthedRecords.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { start: 1, end: 2 }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
