import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetClientRateLimitProfileTool } from '../../src/tools/setClientRateLimitProfile.js';

const MAC = 'AA-BB-CC-DD-EE-FF';

describe('tools/setClientRateLimitProfile', () => {
    let mockServer: McpServer;
    let mockClient: OmadaClient;
    let toolHandler: (args: unknown, extra: { sessionId?: string }) => Promise<CallToolResult>;
    let registered: { name?: string; config?: { description?: string } };

    beforeEach(() => {
        registered = {};
        mockServer = {
            registerTool: vi.fn((name, config, handler) => {
                registered = { name, config };
                toolHandler = (args, extra) => handler(z.object(config.inputSchema).parse(args), extra);
            }),
        } as unknown as McpServer;
        mockClient = {
            getRateLimitProfiles: vi.fn().mockResolvedValue([
                { profileId: 'p1', name: 'Default' },
                { id: 'p2', name: 'Old' },
            ]),
            getClientDetail: vi.fn().mockResolvedValue({
                mac: MAC,
                name: 'phone',
                wireless: true,
                rateLimit: { enable: false, upEnable: false, upUnit: 1, upLimit: 0, downEnable: false, downUnit: 1, downLimit: 0 },
            }),
            setClientRateLimitProfile: vi.fn().mockResolvedValue({}),
        } as unknown as OmadaClient;
        registerSetClientRateLimitProfileTool(mockServer, mockClient);
    });

    const structured = (result: CallToolResult): Record<string, unknown> => result.structuredContent as Record<string, unknown>;

    it('registers the tool', () => {
        expect(registered.name).toBe('setClientRateLimitProfile');
        expect(registered.config?.description).toContain('Preview');
    });

    it('defaults omitted dryRun to a preview that sends nothing', async () => {
        const result = await toolHandler({ clientMac: MAC, profileId: 'p1' }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ mode: 'dry-run', status: 'planned' });
        expect(mockClient.setClientRateLimitProfile).not.toHaveBeenCalled();
    });

    it('refuses an unknown client before any write', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue(undefined as never);
        await expect(toolHandler({ ...{ clientMac: MAC, profileId: 'p1' }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow(
            `No client with MAC ${MAC}`
        );
        expect(mockClient.setClientRateLimitProfile).not.toHaveBeenCalled();
    });

    it('reports a controller rejection', async () => {
        vi.mocked(mockClient.setClientRateLimitProfile).mockRejectedValue(new OmadaApiError(-1001, 'Invalid request parameters.'));
        await expect(toolHandler({ ...{ clientMac: MAC, profileId: 'p1' }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow('errorCode -1001');
    });

    it('applies the profile once and verifies it by rateLimitId', async () => {
        vi.mocked(mockClient.getClientDetail)
            .mockResolvedValueOnce({ mac: MAC, rateLimit: {} } as never)
            .mockResolvedValue({ mac: MAC, rateLimit: { rateLimitId: 'p1', enable: true } } as never);
        const result = await toolHandler({ clientMac: MAC, profileId: 'p1', siteId: 'site-1', dryRun: false }, { sessionId: 's1' });
        expect(mockClient.setClientRateLimitProfile).toHaveBeenCalledWith(MAC, 'p1', 'site-1', undefined);
        expect(structured(result)).toMatchObject({ status: 'verified' });
    });

    it('accepts a profile listed by id on older controllers', async () => {
        const result = await toolHandler({ clientMac: MAC, profileId: 'p2' }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ status: 'planned' });
    });

    it('refuses an unknown profile before any write', async () => {
        await expect(toolHandler({ clientMac: MAC, profileId: 'nope', dryRun: false }, { sessionId: 's1' })).rejects.toThrow(
            'No rate limit profile with ID nope exists'
        );
        expect(mockClient.setClientRateLimitProfile).not.toHaveBeenCalled();
    });
});
