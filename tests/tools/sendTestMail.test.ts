import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSendTestMailTool } from '../../src/tools/sendTestMail.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/sendTestMail', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    const payload = {
        smtpServer: 'smtp.example.com',
        port: 587,
        sslEnable: true,
        authEnable: true,
        username: 'u',
        password: 'p',
        senderAddress: 'a@example.com',
        receiver: 'b@example.com',
    };

    beforeEach(() => {
        client = { sendTestMail: vi.fn(async () => undefined) };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSendTestMailTool(server, client as unknown as OmadaClient);
    });

    it('previews without sending and keeps the password out of the target', async () => {
        const result = await handler({ payload }, {});
        expect(client.sendTestMail).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({
            status: 'planned',
            result: { target: { smtpServer: 'smtp.example.com', receiver: 'b@example.com' } },
        });
        expect(JSON.stringify(result.structuredContent)).not.toContain('"p"');
    });

    it('sends once and surfaces delivery failures', async () => {
        await handler({ payload, dryRun: false }, {});
        expect(client.sendTestMail).toHaveBeenCalledWith(payload, undefined);
        client.sendTestMail.mockRejectedValueOnce(new OmadaApiError(-30003, 'Failed to send the email to the specified recipient.'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -30003)');
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: 1 })).toThrow();
    });
});
