import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateRadiusUserTool } from '../../src/tools/createRadiusUser.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const server1 = { radiusServerIp: '10.0.0.1', radiusPort: 1812, radiusPwd: 'lab-pw-1' };

describe('tools/createRadiusUser', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let profiles: Record<string, unknown>[];
    let ldaps: Record<string, unknown>[];
    let users: Record<string, unknown>[];
    let radiusServer: Record<string, unknown>;

    beforeEach(() => {
        profiles = [
            {
                radiusProfileId: 'b1',
                name: 'Built-in',
                builtInServer: true,
                authServer: [],
                radiusAccountingEnable: false,
                wirelessVlanAssignment: false,
            },
            {
                radiusProfileId: 'r1',
                name: 'corp',
                builtInServer: false,
                authServer: [server1],
                radiusAccountingEnable: false,
                wirelessVlanAssignment: false,
            },
        ];
        ldaps = [
            {
                ldapProfileId: 'l1',
                name: 'dir',
                status: true,
                bindType: 2,
                server: '10.0.0.2',
                dstPort: 389,
                useSsl: false,
                cn: 'uid',
                baseDn: 'dc=x',
                regularDn: 'cn=r',
                regularPassword: 'lab-pw-3',
            },
        ];
        users = [
            { userId: 'u1', type: 0, username: 'alice', password: 'lab-pw-2', upRateLimit: 0, vlanId: 10 },
            { userId: 'u2', type: 1, username: 'AA-BB-CC-00-11-22', password: 'x' },
        ];
        radiusServer = { enable: false, authServerPort: 1812, tunnelReplyEnable: false, serverAddressType: 0, status: false };
        const replace = (list: Record<string, unknown>[], key: string, id: string, body: Record<string, unknown>) =>
            list.map((item) => (item[key] === id ? { ...item, ...body } : item));
        client = {
            listRadiusProfiles: vi.fn(async () => profiles),
            createRadiusProfile: vi.fn((body: Record<string, unknown>) => {
                profiles = [...profiles, { radiusProfileId: 'r2', ...body }];
                return Promise.resolve({ id: 'r2' });
            }),
            updateRadiusProfile: vi.fn((id: string, body: Record<string, unknown>) => {
                profiles = replace(profiles, 'radiusProfileId', id, body);
                return Promise.resolve(undefined);
            }),
            deleteRadiusProfile: vi.fn((id: string) => {
                profiles = profiles.filter((item) => item.radiusProfileId !== id);
                return Promise.resolve(undefined);
            }),
            getLdapProfileList: vi.fn(async () => ldaps),
            createLdapProfile: vi.fn((body: Record<string, unknown>) => {
                ldaps = [...ldaps, { ldapProfileId: 'l2', ...body }];
                return Promise.resolve({ id: 'l2' });
            }),
            updateLdapProfile: vi.fn((id: string, body: Record<string, unknown>) => {
                ldaps = replace(ldaps, 'ldapProfileId', id, body);
                return Promise.resolve(undefined);
            }),
            deleteLdapProfile: vi.fn((id: string) => {
                ldaps = ldaps.filter((item) => item.ldapProfileId !== id);
                return Promise.resolve(undefined);
            }),
            getRadiusUserList: vi.fn(async () => ({ data: users, totalRows: users.length })),
            createRadiusUser: vi.fn((body: { userInfo?: { username: string; password: string }; type: number; macAddress?: string }) => {
                const { userInfo, ...rest } = body;
                users = [...users, { userId: 'u3', ...rest, ...(userInfo ?? { username: rest.macAddress }) }];
                return Promise.resolve({ id: 'u3' });
            }),
            updateRadiusUser: vi.fn((id: string, body: { userInfo?: Record<string, unknown> }) => {
                const { userInfo, ...rest } = body;
                users = replace(users, 'userId', id, { ...rest, ...userInfo });
                return Promise.resolve(undefined);
            }),
            deleteRadiusUser: vi.fn((id: string) => {
                users = users.filter((item) => item.userId !== id);
                return Promise.resolve(undefined);
            }),
            getRadiusServer: vi.fn(async () => radiusServer),
            setRadiusServer: vi.fn((body: Record<string, unknown>) => {
                radiusServer = { ...radiusServer, ...body };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCreateRadiusUserTool(server, client as unknown as OmadaClient);
    });

    it('creates password and MAC users and verifies them', async () => {
        const payload = { type: 0, userInfo: { username: 'bob', password: 'lab-pw-4' }, upRateLimit: 2048 };
        expect((await handler({ payload }, {})).structuredContent).toMatchObject({ status: 'planned' });
        expect((await handler({ payload, dryRun: false }, {})).structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'u3' } });
        users = users.filter((user) => user.userId !== 'u3');
        const mac = await handler({ payload: { type: 1, macAddress: 'AA-BB-CC-00-11-33' }, dryRun: false }, {});
        expect(mac.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses duplicate usernames and surfaces rejections', async () => {
        await expect(handler({ payload: { type: 0, userInfo: { username: 'alice', password: 'p' } }, dryRun: false }, {})).rejects.toThrow(
            'already exists'
        );
        client.createRadiusUser.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { type: 0, userInfo: { username: 'carol', password: 'p' } }, dryRun: false }, {})).rejects.toThrow(
            '(errorCode -1001)'
        );
        expect(definition.inputSchema.payload).toBeTruthy();
    });
});
