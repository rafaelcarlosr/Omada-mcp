import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteRateLimitProfileTool } from '../../src/tools/deleteRateLimitProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteRateLimitProfile', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [
            { profileId: 'p-1', name: 'old', downLimitEnable: false, upLimitEnable: false, defaultProfile: false },
            { profileId: 'p-default', name: 'Default', downLimitEnable: false, upLimitEnable: false, defaultProfile: true },
        ];
        client = {
            getRateLimitProfiles: vi.fn(async () => rows),
            createRateLimitProfile: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, profileId: 'new-1' }];
                return Promise.resolve('new-1');
            }),
            updateRateLimitProfile: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.profileId === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteRateLimitProfile: vi.fn((id: string) => {
                rows = rows.filter((row) => row.profileId !== id);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteRateLimitProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.profileId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ profileId: 'p-1' }, {});
        expect(client.deleteRateLimitProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'p-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ profileId: 'p-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteRateLimitProfile).toHaveBeenCalledWith('p-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ profileId: 'missing', dryRun: false }, {})).rejects.toThrow('No rate limit profile with id "missing"');
    });

    it('refuses built-in profiles', async () => {
        await expect(handler({ profileId: 'p-default', dryRun: false }, {})).rejects.toThrow('built-in');
        expect(client.deleteRateLimitProfile).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.deleteRateLimitProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ profileId: 'p-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
