import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetSiteMailServerTool } from '../../src/tools/setSiteMailServer.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = {
    sender: 'lab@example.com',
    receiver: 'ops@example.com',
    ssl: true,
    smtpServer: 'smtp.example.com',
    smtpPort: 465,
    auth: true,
    username: 'lab@example.com',
    authCode: 'Code12345',
};

describe('tools/setSiteMailServer', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown> | undefined;

    beforeEach(() => {
        state = undefined;
        client = {
            getSiteMailServer: vi.fn(async () => state),
            createSiteMailServer: vi.fn((body: Record<string, unknown>) => {
                state = { id: 'mail-1', ...body, resource: 0 };
                return Promise.resolve(undefined);
            }),
            updateSiteMailServer: vi.fn((_id: string, body: Record<string, unknown>) => {
                state = { id: 'mail-1', ...body, resource: 0 };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetSiteMailServerTool(server, client as unknown as OmadaClient);
    });

    it('refuses credentials without authentication and unknown fields', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, auth: false })).toThrow('username applies only when auth is true.');
        expect(() => definition.inputSchema.payload.parse({ ...payload, id: 'x' })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews the creation with a warning when the site has no mail server', async () => {
        const result = await handler({ payload }, {});
        expect(client.createSiteMailServer).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({
            status: 'planned',
            result: { before: {}, warnings: [expect.stringContaining('cannot remove it later')] },
        });
    });

    it('creates the mail server when none exists and verifies it', async () => {
        const result = await handler({ payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.createSiteMailServer).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(client.updateSiteMailServer).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('updates the existing mail server by id', async () => {
        state = { id: 'mail-1', ...payload, authCode: 'OldCode999', resource: 0 };
        const changed = {
            sender: 'lab2@example.com',
            receiver: 'ops@example.com',
            ssl: false,
            smtpServer: 'smtp.example.com',
            smtpPort: 25,
            auth: false,
        };
        const result = await handler({ payload: changed, dryRun: false }, {});
        expect(client.updateSiteMailServer).toHaveBeenCalledWith('mail-1', changed, undefined, undefined);
        expect(client.createSiteMailServer).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('surfaces controller rejections', async () => {
        client.createSiteMailServer.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
