import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerResolveSiteAlertsTool } from '../../src/tools/resolveSiteAlerts.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/resolveSiteAlerts', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = {};
        client = {
            listSiteAlerts: vi.fn(async () => ({ data: [{ id: 'a-1', resolved: false }] })),
            resolveSiteAlerts: vi.fn(async () => undefined),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerResolveSiteAlertsTool(server, client as unknown as OmadaClient);
    });

    it('previews the alerts, then resolves only the listed IDs', async () => {
        expect((await handler({ logIds: ['a-1'], startTime: 1, endTime: 2 }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { target: { alerts: [{ id: 'a-1' }] } },
        });
        await handler({ logIds: ['a-1'], startTime: 1, endTime: 2, siteId: 's-1', dryRun: false }, {});
        expect(client.resolveSiteAlerts).toHaveBeenCalledWith({ logIds: ['a-1'], startTime: 1, endTime: 2 }, 's-1', undefined);
        expect(state).toEqual({});
    });

    it('refuses unknown alerts and reversed periods', async () => {
        await expect(handler({ logIds: ['a-9'], startTime: 1, endTime: 2, dryRun: false }, {})).rejects.toThrow('No alert log with id a-9');
        await expect(handler({ logIds: ['a-1'], startTime: 2, endTime: 1 }, {})).rejects.toThrow('startTime must be before endTime.');
        client.listSiteAlerts.mockResolvedValueOnce(undefined);
        await expect(handler({ logIds: ['a-1'], startTime: 1, endTime: 2 }, {})).rejects.toThrow('No alert log');
        expect(() => definition.inputSchema.logIds.parse([])).toThrow();
        client.resolveSiteAlerts.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ logIds: ['a-1'], startTime: 1, endTime: 2, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
