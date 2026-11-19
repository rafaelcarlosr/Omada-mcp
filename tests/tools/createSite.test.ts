import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateSiteTool } from '../../src/tools/createSite.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = {
    name: 'branch',
    region: 'Brazil',
    timeZone: 'America/Sao_Paulo',
    scenario: 'Office',
    deviceAccountSetting: { username: 'admin', password: 'Aa1!Zx8wQe4Rt6Yu' },
};

describe('tools/createSite', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let sites: Record<string, unknown>[];

    beforeEach(() => {
        sites = [{ siteId: 's-1', name: 'main', region: 'Brazil', timeZone: 'America/Sao_Paulo', scenario: 'General' }];
        client = {
            listSites: vi.fn(async () => sites.map(({ siteId, name }) => ({ siteId, name }))),
            getSiteDetail: vi.fn(async (siteId: string) => sites.find((site) => site.siteId === siteId)),
            createSite: vi.fn((body: Record<string, unknown>) => {
                const { deviceAccountSetting: _account, ...rest } = body;
                sites = [...sites, { ...rest, siteId: 's-2', type: 0 }];
                return Promise.resolve({ siteId: 's-2' });
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCreateSiteTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload and takes no site ID', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.siteId).toBeUndefined();
    });

    it('previews without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.createSite).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, existingCount: 1 } });
    });

    it('creates once and verifies the site detail, leaving the device password unverified', async () => {
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.createSite).toHaveBeenCalledWith(payload, undefined);
        expect(client.getSiteDetail).toHaveBeenCalledWith('s-2', undefined);
        expect(result.structuredContent).toMatchObject({
            status: 'verified',
            result: { createdId: 's-2', notVerifiedFields: ['deviceAccountSetting'] },
        });
    });

    it('refuses a duplicate name and surfaces rejections', async () => {
        await expect(handler({ payload: { ...payload, name: 'main' }, dryRun: false }, {})).rejects.toThrow('already exists');
        client.createSite.mockRejectedValueOnce(new OmadaApiError(-30105, 'Invalid password.'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -30105): Invalid password.');
    });
});
