import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateApnProfileTool } from '../../src/tools/createApnProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'carrier', pdpType: 0, apnType: 0, apn: 'internet.test', authentication: 1, username: 'u1', password: 'S3cretApn' };

describe('tools/createApnProfile', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [
            { id: 'apn-1', name: 'old', pdpType: 0, apnType: 1, authentication: 0, buildIn: false },
            { id: 'apn-builtin', name: 'Auto', pdpType: 0, apnType: 1, authentication: 0, buildIn: true },
        ];
        client = {
            listApnProfiles: vi.fn(async () => rows),
            createApnProfile: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve('new-1');
            }),
            updateApnProfile: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteApnProfile: vi.fn((id: string) => {
                rows = rows.filter((row) => row.id !== id);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCreateApnProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews by default without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.createApnProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true } });
    });

    it('creates once and verifies the readback', async () => {
        const result = await handler({ payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.createApnProfile).toHaveBeenCalledTimes(1);
        expect(client.createApnProfile).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'new-1' } });
    });

    it('refuses a duplicate name', async () => {
        await expect(
            handler(
                {
                    payload: { name: 'old', pdpType: 0, apnType: 0, apn: 'internet.test', authentication: 1, username: 'u1', password: 'S3cretApn' },
                    dryRun: false,
                },
                {}
            )
        ).rejects.toThrow('already exists');
        expect(client.createApnProfile).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.createApnProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
