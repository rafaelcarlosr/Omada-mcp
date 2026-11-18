import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateTimeRangeProfileTool } from '../../src/tools/updateTimeRangeProfile.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'office', dayMode: 1, timeList: [{ dayType: 0, startTimeH: 8, startTimeM: 0, endTimeH: 18, endTimeM: 0 }] };

describe('tools/updateTimeRangeProfile', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let profiles: Record<string, unknown>[];

    beforeEach(() => {
        profiles = [
            { profileId: 'tr-1', name: 'night', dayMode: 0, timeList: [{ dayType: 0, startTimeH: 0, startTimeM: 0, endTimeH: 6, endTimeM: 0 }] },
        ];
        client = {
            listTimeRangeProfiles: vi.fn(async () => profiles),
            createTimeRangeProfile: vi.fn((body: Record<string, unknown>) => {
                profiles = [...profiles, { ...body, profileId: 'new-1' }];
                return Promise.resolve({});
            }),
            updateTimeRangeProfile: vi.fn((id: string, body: Record<string, unknown>) => {
                profiles = profiles.map((row) => (row.profileId === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteTimeRangeProfile: vi.fn((id: string) => {
                profiles = profiles.filter((row) => row.profileId !== id);
                return Promise.resolve({});
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerUpdateTimeRangeProfileTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.profileId.parse(' ')).toThrow();
    });

    it('previews the difference without writing', async () => {
        const result = await handler({ profileId: 'tr-1', payload: payload }, {});
        expect(client.updateTimeRangeProfile).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'tr-1', alreadyMatches: false } });
    });

    it('applies once and verifies the readback', async () => {
        const result = await handler({ profileId: 'tr-1', payload: payload, dryRun: false }, {});
        expect(client.updateTimeRangeProfile).toHaveBeenCalledWith('tr-1', payload, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ profileId: 'missing', payload: payload }, {})).rejects.toThrow('"missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updateTimeRangeProfile.mockRejectedValueOnce(new OmadaApiError(-33603, 'rejected'));
        await expect(handler({ profileId: 'tr-1', payload: payload, dryRun: false }, {})).rejects.toThrow('(errorCode -33603): rejected');
    });
});
