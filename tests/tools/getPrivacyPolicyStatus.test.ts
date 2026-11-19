import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetPrivacyPolicyStatusTool } from '../../src/tools/getPrivacyPolicyStatus.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getPrivacyPolicyStatus', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getPrivacyPolicyStatus: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetPrivacyPolicyStatusTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({}, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getPrivacyPolicyStatus',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getPrivacyPolicyStatus).toHaveBeenCalledWith(undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.getPrivacyPolicyStatus.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
