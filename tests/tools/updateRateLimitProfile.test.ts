import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateRateLimitProfileTool } from '../../src/tools/updateRateLimitProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'guests-2', downLimitEnable: false, upLimitEnable: true, upLimit: 500 };

describe('tools/updateRateLimitProfile', () => {
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
        registerUpdateRateLimitProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.profileId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ profileId: 'p-1', payload }, {});
        expect(client.updateRateLimitProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'p-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ profileId: 'p-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateRateLimitProfile).toHaveBeenCalledWith('p-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ profileId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No rate limit profile with id "missing"');
    });

    it('refuses built-in profiles', async () => {
        await expect(handler({ profileId: 'p-default', payload, dryRun: false }, {})).rejects.toThrow('built-in');
        expect(client.updateRateLimitProfile).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.updateRateLimitProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ profileId: 'p-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
