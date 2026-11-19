import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateSiteTemplateTool } from '../../src/tools/createSiteTemplate.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/createSiteTemplate', () => {
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
        registerCreateSiteTemplateTool(server, client as unknown as OmadaClient);
    });

    it('previews, then creates once and verifies the name, leaving modules unverified', async () => {
        expect((await handler({ payload: { name: 'retail', settings: ['firewall'] } }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ payload: { name: 'retail', settings: ['firewall'] }, dryRun: false }, {});
        expect(client.createSiteTemplate).toHaveBeenCalledWith({ name: 'retail', settings: ['firewall'] }, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 't-3', notVerifiedFields: ['settings'] } });
    });

    it('refuses duplicates and the deprecated type, and surfaces rejections', async () => {
        await expect(handler({ payload: { name: 'branch' }, dryRun: false }, {})).rejects.toThrow('already exists');
        expect(() => definition.inputSchema.payload.parse({ name: 'x', type: 1 })).toThrow();
        client.getSiteTemplateList.mockResolvedValueOnce(undefined);
        client.createSiteTemplate.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { name: 'retail' }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
    });
});
