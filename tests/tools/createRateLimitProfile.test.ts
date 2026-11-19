import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateRateLimitProfileTool } from '../../src/tools/createRateLimitProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'guests', downLimitEnable: true, downLimit: 1000, upLimitEnable: false };

describe('tools/createRateLimitProfile', () => {
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
        registerCreateRateLimitProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews by default without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.createRateLimitProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true } });
    });

    it('creates once and verifies the readback', async () => {
        const result = await handler({ payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.createRateLimitProfile).toHaveBeenCalledTimes(1);
        expect(client.createRateLimitProfile).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'new-1' } });
    });

    it('refuses a duplicate name', async () => {
        await expect(
            handler({ payload: { name: 'old', downLimitEnable: true, downLimit: 1000, upLimitEnable: false }, dryRun: false }, {})
        ).rejects.toThrow('already exists');
        expect(client.createRateLimitProfile).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.createRateLimitProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
