import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteAuthedRecordTool } from '../../src/tools/deleteAuthedRecord.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteAuthedRecord', () => {
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
        registerDeleteAuthedRecordTool(server, client as unknown as OmadaClient);
    });

    it('previews, then deletes and verifies it is gone', async () => {
        expect((await handler({ recordId: 'a-1' }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ recordId: 'a-1', dryRun: false }, {});
        expect(client.deleteAuthedRecord).toHaveBeenCalledWith('a-1', undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown records and surfaces rejections', async () => {
        expect(() => definition.inputSchema.recordId.parse('')).toThrow();
        await expect(handler({ recordId: 'nope', dryRun: false }, {})).rejects.toThrow('No authorization record with id "nope"');
        client.deleteAuthedRecord.mockRejectedValueOnce(new OmadaApiError(-1001, 'Auth record does not exist.'));
        await expect(handler({ recordId: 'a-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
    });
});
