import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateHotspotLocalUserTool } from '../../src/tools/createHotspotLocalUser.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = {
    userName: 'guest1',
    password: 'S3cret!',
    enable: true,
    expirationTime: 1900000000000,
    bindingType: 0,
    maxUsers: 1,
    rateLimit: { mode: 0, customRateLimit: { downLimitEnable: false, upLimitEnable: false } },
    trafficLimitEnable: false,
    portals: [],
    applyToAllPortals: true,
};

describe('tools/createHotspotLocalUser', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let users: Record<string, unknown>[];

    beforeEach(() => {
        users = [
            {
                id: 'lu-1',
                userName: 'existing',
                password: 'old-secret',
                enable: false,
                expirationTime: 1,
                bindingType: 0,
                rateLimit: { mode: 0 },
                trafficLimitEnable: false,
                portals: [],
            },
        ];
        client = {
            listHotspotLocalUsers: vi.fn(async () => users),
            createHotspotLocalUser: vi.fn((body: Record<string, unknown>) => {
                users = [...users, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updateHotspotLocalUser: vi.fn((id: string, body: Record<string, unknown>) => {
                users = users.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteHotspotLocalUser: vi.fn((id: string) => {
                users = users.filter((row) => row.id !== id);
                return Promise.resolve({});
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCreateHotspotLocalUserTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews by default without writing', async () => {
        const result = await handler({ payload: payload }, {});
        expect(client.createHotspotLocalUser).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true } });
    });

    it('creates once and verifies the readback', async () => {
        const result = await handler({ payload: payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.createHotspotLocalUser).toHaveBeenCalledTimes(1);
        expect(client.createHotspotLocalUser).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'new-1' } });
    });

    it('never returns or verifies the clear-text password', async () => {
        const result = await handler({ payload, dryRun: false }, {});
        expect(JSON.stringify(result)).not.toContain('S3cret!');
        expect(result.structuredContent).toMatchObject({ result: { notVerifiedFields: ['password'] } });
    });

    it('refuses a duplicate user name', async () => {
        await expect(handler({ payload: { ...payload, userName: 'existing' } }, {})).rejects.toThrow('already exists');
    });

    it('surfaces controller rejections', async () => {
        client.createHotspotLocalUser.mockRejectedValueOnce(new OmadaApiError(-33000, 'rejected'));
        await expect(handler({ payload: payload, dryRun: false }, {})).rejects.toThrow('(errorCode -33000): rejected');
    });
});
