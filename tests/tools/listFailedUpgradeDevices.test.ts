import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListFailedUpgradeDevicesTool } from '../../src/tools/listFailedUpgradeDevices.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listFailedUpgradeDevices', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listFailedUpgradeDevices: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListFailedUpgradeDevicesTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ upgradeLogId: 'u-1', page: 2, pageSize: 5 }, {});
        expect(client.listFailedUpgradeDevices).toHaveBeenCalledWith('u-1', 2, 5, undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listFailedUpgradeDevices.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ upgradeLogId: 'u-1', page: 2, pageSize: 5 }, {})).rejects.toThrow('boom');
    });
});
