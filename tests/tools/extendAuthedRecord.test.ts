import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerExtendAuthedRecordTool } from '../../src/tools/extendAuthedRecord.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/extendAuthedRecord', () => {
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
        registerExtendAuthedRecordTool(server, client as unknown as OmadaClient);
    });

    it('validates the period range', () => {
        expect(() => definition.inputSchema.periodMs.parse(1000)).toThrow();
    });

    it('previews the record, then applies the period', async () => {
        expect((await handler({ recordId: 'a-1', periodMs: 3_600_000 }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { target: { periodMs: 3_600_000 } },
        });
        await handler({ recordId: 'a-1', periodMs: 3_600_000, dryRun: false }, {});
        expect(client.extendAuthedRecord).toHaveBeenCalledWith('a-1', 3_600_000, undefined, undefined);
    });

    it('refuses unknown records and surfaces rejections', async () => {
        await expect(handler({ recordId: 'nope', periodMs: 60_000, dryRun: false }, {})).rejects.toThrow('No authorization record with id "nope"');
        client.extendAuthedRecord.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ recordId: 'a-1', periodMs: 60_000, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
