import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetAuthSurveyTool } from '../../src/tools/getAuthSurvey.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getAuthSurvey', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getAuthSurvey: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetAuthSurveyTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ surveyId: 's-1', siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getAuthSurvey',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getAuthSurvey).toHaveBeenCalledWith('s-1', 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
        expect(definition.inputSchema).toBeTruthy();
    });

    it('validates the identifier', () => {
        expect(() => definition.inputSchema.surveyId.parse('')).toThrow();
    });

    it('propagates read failures', async () => {
        client.getAuthSurvey.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ surveyId: 's-1', siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
