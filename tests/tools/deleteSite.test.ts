import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteSiteTool } from '../../src/tools/deleteSite.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteSite', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let sites: Record<string, unknown>[];

    beforeEach(() => {
        sites = [
            { siteId: 'default', name: 'main' },
            { siteId: 'old', name: 'old-branch' },
            { siteId: 'busy', name: 'busy' },
        ];
        client = {
            listSites: vi.fn(async () => sites),
            configuredSiteId: vi.fn(() => 'default'),
            listDevices: vi.fn(async (siteId: string) => (siteId === 'busy' ? [{ mac: 'AA-BB-CC-DD-EE-01' }] : [])),
            deleteSite: vi.fn((siteId: string) => {
                sites = sites.filter((site) => site.siteId !== siteId);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteSiteTool(server, client as unknown as OmadaClient);
    });

    it('requires an explicit site ID', () => {
        expect(() => definition.inputSchema.siteId.parse(undefined)).toThrow();
        expect(() => definition.inputSchema.siteId.parse(' ')).toThrow();
    });

    it('previews the site without deleting', async () => {
        const result = await handler({ siteId: 'old' }, {});
        expect(client.deleteSite).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'old', warnings: [expect.any(String)] } });
    });

    it('deletes an empty site once and verifies it is gone', async () => {
        const result = await handler({ siteId: 'old', dryRun: false }, {});
        expect(client.deleteSite).toHaveBeenCalledWith('old', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses the configured default site and sites with devices, already in preview', async () => {
        await expect(handler({ siteId: 'default' }, {})).rejects.toThrow('configured as OMADA_SITE_ID');
        await expect(handler({ siteId: 'busy', dryRun: false }, {})).rejects.toThrow('still has 1 device(s)');
        expect(client.deleteSite).not.toHaveBeenCalled();
    });

    it('refuses unknown sites and surfaces controller rejections', async () => {
        await expect(handler({ siteId: 'missing', dryRun: false }, {})).rejects.toThrow('No site with id "missing"');
        client.deleteSite.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ siteId: 'old', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
