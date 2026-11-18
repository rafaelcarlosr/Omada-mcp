import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDisconnectHotspotAuthRecordTool } from '../../src/tools/disconnectHotspotAuthRecord.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/disconnectHotspotAuthRecord', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = {
            listHotspotAuthRecords: vi.fn(async () => [{ id: 'ar-1', mac: 'AA-BB-CC-DD-EE-FF', authType: 3 }]),
            disconnectHotspotAuthRecord: vi.fn(async () => ({})),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDisconnectHotspotAuthRecordTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.recordId.parse('')).toThrow();
    });

    it('previews the session without disconnecting', async () => {
        const result = await handler({ recordId: 'ar-1' }, {});
        expect(client.disconnectHotspotAuthRecord).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { target: { mac: 'AA-BB-CC-DD-EE-FF' } } });
    });

    it('disconnects once when applied', async () => {
        const result = await handler({ recordId: 'ar-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.disconnectHotspotAuthRecord).toHaveBeenCalledWith('ar-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ result: { writeAcknowledged: true } });
    });

    it('refuses unknown records', async () => {
        await expect(handler({ recordId: 'nope', dryRun: false }, {})).rejects.toThrow('No hotspot authentication record');
        expect(client.disconnectHotspotAuthRecord).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.disconnectHotspotAuthRecord.mockRejectedValueOnce(new OmadaApiError(-1, 'gone'));
        await expect(handler({ recordId: 'ar-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1): gone');
    });
});
