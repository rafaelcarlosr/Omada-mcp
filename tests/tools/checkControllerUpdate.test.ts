import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCheckControllerUpdateTool } from '../../src/tools/checkControllerUpdate.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/checkControllerUpdate', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { checkControllerUpdate: vi.fn(async () => ({ currentChannel: 0, upgradeList: [{ channel: 0, update: false }] })) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerCheckControllerUpdateTool(server, client as unknown as OmadaClient);
    });

    it('previews, then checks the channel and returns the result', async () => {
        expect((await handler({ payload: {} }, {})).structuredContent).toMatchObject({ status: 'planned', result: { target: { channel: 0 } } });
        expect(client.checkControllerUpdate).not.toHaveBeenCalled();
        const result = await handler({ payload: { channel: 1 }, dryRun: false }, {});
        expect(client.checkControllerUpdate).toHaveBeenCalledWith({ channel: 1 }, undefined);
        expect(JSON.stringify(result.structuredContent)).toContain('upgradeList');
    });

    it('surfaces rejections', async () => {
        client.checkControllerUpdate.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { channel: 0 }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
