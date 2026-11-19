import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateSiteTool } from '../../src/tools/updateSite.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'branch', region: 'Brazil', timeZone: 'America/Sao_Paulo', scenario: 'Office', address: 'lab', tagIds: ['t-1'] };

describe('tools/updateSite', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let site: Record<string, unknown>;

    beforeEach(() => {
        site = { siteId: 's-1', name: 'branch', region: 'Brazil', timeZone: 'America/Sao_Paulo', scenario: 'General', tagIds: [], dst: { mode: 0 } };
        client = {
            listSites: vi.fn(async () => [{ siteId: 's-1', name: 'branch' }]),
            getSiteDetail: vi.fn(async () => site),
            updateSite: vi.fn((_id: string, body: Record<string, unknown>) => {
                site = { ...site, ...body };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerUpdateSiteTool(server, client as unknown as OmadaClient);
    });

    it('requires an explicit site ID and the documented payload', () => {
        expect(() => definition.inputSchema.siteId.parse(undefined)).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews the differences against the site detail', async () => {
        const result = await handler({ siteId: 's-1', payload }, {});
        expect(client.updateSite).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { alreadyMatches: false } });
    });

    it('updates once and verifies by readback', async () => {
        const result = await handler({ siteId: 's-1', payload, dryRun: false }, {});
        expect(client.updateSite).toHaveBeenCalledWith('s-1', payload, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown sites and surfaces rejections', async () => {
        await expect(handler({ siteId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No site with id "missing"');
        client.updateSite.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ siteId: 's-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
