import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetSurveyResultTool } from '../../src/tools/getSurveyResult.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getSurveyResult', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getSurveyResult: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetSurveyResultTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ resultId: 'r-1', siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getSurveyResult',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getSurveyResult).toHaveBeenCalledWith('r-1', 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
        expect(definition.inputSchema).toBeTruthy();
    });

    it('validates the identifier', () => {
        expect(() => definition.inputSchema.resultId.parse('')).toThrow();
    });

    it('propagates read failures', async () => {
        client.getSurveyResult.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ resultId: 'r-1', siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
