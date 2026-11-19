import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteApnProfileTool } from '../../src/tools/deleteApnProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteApnProfile', () => {
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
        registerDeleteApnProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.profileId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ profileId: 'apn-1' }, {});
        expect(client.deleteApnProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'apn-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ profileId: 'apn-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteApnProfile).toHaveBeenCalledWith('apn-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ profileId: 'missing', dryRun: false }, {})).rejects.toThrow('No APN profile with id "missing"');
    });

    it('refuses built-in profiles', async () => {
        await expect(handler({ profileId: 'apn-builtin', dryRun: false }, {})).rejects.toThrow('built-in');
        expect(client.deleteApnProfile).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.deleteApnProfile.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ profileId: 'apn-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
