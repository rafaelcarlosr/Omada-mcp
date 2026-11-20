import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDisableClientRateLimitTool } from '../../src/tools/disableClientRateLimit.js';

const MAC = 'AA-BB-CC-DD-EE-FF';

describe('tools/disableClientRateLimit', () => {
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
            getClientDetail: vi.fn().mockResolvedValue({
                mac: MAC,
                name: 'phone',
                wireless: true,
                rateLimit: { enable: true, upEnable: true, upLimit: 5, downEnable: true, downLimit: 10 },
            }),
            disableClientRateLimit: vi.fn().mockResolvedValue({}),
        } as unknown as OmadaClient;
        registerDisableClientRateLimitTool(mockServer, mockClient);
    });

    const structured = (result: CallToolResult): Record<string, unknown> => result.structuredContent as Record<string, unknown>;

    it('registers the tool', () => {
        expect(registered.name).toBe('disableClientRateLimit');
        expect(registered.config?.description).toContain('Preview');
    });

    it('defaults omitted dryRun to a preview that sends nothing', async () => {
        const result = await toolHandler({ clientMac: MAC }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ mode: 'dry-run', status: 'planned' });
        expect(mockClient.disableClientRateLimit).not.toHaveBeenCalled();
    });

    it('refuses an unknown client before any write', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue(undefined as never);
        await expect(toolHandler({ ...{ clientMac: MAC }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow(`No client with MAC ${MAC}`);
        expect(mockClient.disableClientRateLimit).not.toHaveBeenCalled();
    });

    it('reports a controller rejection', async () => {
        vi.mocked(mockClient.disableClientRateLimit).mockRejectedValue(new OmadaApiError(-1001, 'Invalid request parameters.'));
        await expect(toolHandler({ ...{ clientMac: MAC }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow('errorCode -1001');
    });

    it('removes a profile and verifies no limit remains', async () => {
        vi.mocked(mockClient.getClientDetail)
            .mockResolvedValueOnce({ mac: MAC, rateLimit: { rateLimitId: 'p1', upEnable: false, downEnable: false } } as never)
            .mockResolvedValue({ mac: MAC, rateLimit: { enable: true, upEnable: false, upLimit: 1, downEnable: false, downLimit: 1 } } as never);
        const result = await toolHandler({ clientMac: MAC, dryRun: false }, { sessionId: 's1' });
        expect(mockClient.disableClientRateLimit).toHaveBeenCalledTimes(1);
        expect(structured(result)).toMatchObject({ status: 'verified' });
    });

    it('is a no-op when no limit is set', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue({ mac: MAC, rateLimit: { upEnable: false, downEnable: false } } as never);
        const result = await toolHandler({ clientMac: MAC, dryRun: false }, { sessionId: 's1' });
        expect(mockClient.disableClientRateLimit).not.toHaveBeenCalled();
        expect(structured(result)).toMatchObject({ result: { noOp: true } });
    });

    it('treats a missing rate limit object as no limit', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue({ mac: MAC } as never);
        const result = await toolHandler({ clientMac: MAC }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ result: { alreadyMatches: true } });
    });
});
