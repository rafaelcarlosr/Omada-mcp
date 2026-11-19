import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetHotspotOperatorTool } from '../../src/tools/getHotspotOperator.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getHotspotOperator', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getHotspotOperator: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetHotspotOperatorTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ operatorId: 'o-1', siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getHotspotOperator',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getHotspotOperator).toHaveBeenCalledWith('o-1', 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
        expect(definition.inputSchema).toBeTruthy();
    });

    it('validates the identifier', () => {
        expect(() => definition.inputSchema.operatorId.parse('')).toThrow();
    });

    it('redacts the password before returning the record', async () => {
        client.getHotspotOperator.mockResolvedValueOnce({ id: 'x', name: 'n', password: 'clear-text-secret' });
        const result = await handler({ operatorId: 'x' }, {});
        expect(result.content[0].text).not.toContain('clear-text-secret');
        expect(JSON.parse(result.content[0].text)).toMatchObject({ id: 'x', password: '[redacted]' });
    });

    it('propagates read failures', async () => {
        client.getHotspotOperator.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ operatorId: 'o-1', siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
