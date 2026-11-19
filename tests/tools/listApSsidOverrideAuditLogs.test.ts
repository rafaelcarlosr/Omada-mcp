import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListApSsidOverrideAuditLogsTool } from '../../src/tools/listApSsidOverrideAuditLogs.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listApSsidOverrideAuditLogs', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listApSsidOverrideAuditLogs: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListApSsidOverrideAuditLogsTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ apMac: 'AA-BB-CC-DD-EE-02', page: 2, pageSize: 5, siteId: 's-1' }, {});
        expect(client.listApSsidOverrideAuditLogs).toHaveBeenCalledWith('AA-BB-CC-DD-EE-02', 2, 5, 's-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listApSsidOverrideAuditLogs.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ apMac: 'AA-BB-CC-DD-EE-02', page: 2, pageSize: 5, siteId: 's-1' }, {})).rejects.toThrow('boom');
    });
});
