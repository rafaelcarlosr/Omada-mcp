import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerRenameSiteTemplateTool } from '../../src/tools/renameSiteTemplate.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/renameSiteTemplate', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let templates: Record<string, unknown>[];
    let bound: Record<string, unknown>[];

    beforeEach(() => {
        templates = [
            { id: 't-1', name: 'branch', bindSiteNum: 0 },
            { id: 't-2', name: 'used', bindSiteNum: 2 },
        ];
        bound = [{ id: 's-1', name: 'shop', overrides: [] }];
        client = {
            getSiteTemplateList: vi.fn(async () => ({ data: templates })),
            listSiteTemplateBoundSites: vi.fn(async () => ({ data: bound })),
            listSites: vi.fn(async () => [
                { siteId: 's-1', name: 'shop' },
                { siteId: 's-2', name: 'office' },
            ]),
            listDevices: vi.fn(async () => [{ mac: 'AA-BB-CC-DD-EE-01' }]),
            getSiteDetail: vi.fn(async (id: string) => ({ siteId: id, name: 'new-site', region: 'Brazil', scenario: 'General' })),
            createSiteTemplate: vi.fn((body: Record<string, unknown>) => {
                templates = [...templates, { id: 't-3', name: body.name, bindSiteNum: 0 }];
                return Promise.resolve({ id: 't-3' });
            }),
            renameSiteTemplate: vi.fn((id: string, name: string) => {
                templates = templates.map((template) => (template.id === id ? { ...template, name } : template));
                return Promise.resolve(undefined);
            }),
            deleteSiteTemplate: vi.fn((id: string) => {
                templates = templates.filter((template) => template.id !== id);
                return Promise.resolve(undefined);
            }),
            copySiteTemplate: vi.fn((_id: string, name: string) => {
                templates = [...templates, { id: 't-4', name, bindSiteNum: 0 }];
                return Promise.resolve({ id: 't-4' });
            }),
            createSiteFromTemplate: vi.fn(async () => 's-9'),
            bindSiteToTemplate: vi.fn((_id: string, body: { siteId: string }) => {
                bound = [...bound, { id: body.siteId, name: 'office' }];
                return Promise.resolve(undefined);
            }),
            unbindSitesFromTemplate: vi.fn((_id: string, ids: string[]) => {
                bound = bound.filter((site) => !ids.includes(String(site.id)));
                return Promise.resolve(undefined);
            }),
            syncSitesWithTemplate: vi.fn(async () => undefined),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerRenameSiteTemplateTool(server, client as unknown as OmadaClient);
    });

    it('previews, then renames once and verifies', async () => {
        expect((await handler({ siteTemplateId: 't-1', name: 'branch-2' }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ siteTemplateId: 't-1', name: 'branch-2', dryRun: false }, {});
        expect(client.renameSiteTemplate).toHaveBeenCalledWith('t-1', 'branch-2', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown templates and surfaces rejections', async () => {
        await expect(handler({ siteTemplateId: 'x', name: 'n', dryRun: false }, {})).rejects.toThrow('No site template with id "x"');
        client.renameSiteTemplate.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ siteTemplateId: 't-1', name: 'n', dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
        expect(definition.inputSchema.name).toBeTruthy();
    });
});
