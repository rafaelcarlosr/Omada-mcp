import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetClientRateLimitTool } from '../../src/tools/setClientRateLimit.js';

const MAC = 'AA-BB-CC-DD-EE-FF';

describe('tools/setClientRateLimit', () => {
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
                rateLimit: { enable: false, upEnable: false, upUnit: 1, upLimit: 0, downEnable: false, downUnit: 1, downLimit: 0 },
            }),
            setClientRateLimit: vi.fn().mockResolvedValue({}),
        } as unknown as OmadaClient;
        registerSetClientRateLimitTool(mockServer, mockClient);
    });

    const structured = (result: CallToolResult): Record<string, unknown> => result.structuredContent as Record<string, unknown>;

    it('registers the tool', () => {
        expect(registered.name).toBe('setClientRateLimit');
        expect(registered.config?.description).toContain('Preview');
    });

    it('defaults omitted dryRun to a preview that sends nothing', async () => {
        const result = await toolHandler({ clientMac: MAC, downLimit: 1000, upLimit: 500 }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ mode: 'dry-run', status: 'planned' });
        expect(mockClient.setClientRateLimit).not.toHaveBeenCalled();
    });

    it('refuses an unknown client before any write', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue(undefined as never);
        await expect(toolHandler({ ...{ clientMac: MAC, downLimit: 1000, upLimit: 500 }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow(
            `No client with MAC ${MAC}`
        );
        expect(mockClient.setClientRateLimit).not.toHaveBeenCalled();
    });

    it('reports a controller rejection', async () => {
        vi.mocked(mockClient.setClientRateLimit).mockRejectedValue(new OmadaApiError(-1001, 'Invalid request parameters.'));
        await expect(toolHandler({ ...{ clientMac: MAC, downLimit: 1000, upLimit: 500 }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow(
            'errorCode -1001'
        );
    });

    it('applies Kbps limits once and verifies them', async () => {
        vi.mocked(mockClient.getClientDetail)
            .mockResolvedValueOnce({ mac: MAC, rateLimit: { upEnable: false, downEnable: false } } as never)
            .mockResolvedValue({
                mac: MAC,
                rateLimit: { enable: true, upEnable: true, upUnit: 1, upLimit: 500, downEnable: true, downUnit: 1, downLimit: 1000 },
            } as never);
        const result = await toolHandler({ clientMac: MAC, downLimit: 1000, upLimit: 500, siteId: 'site-1', dryRun: false }, { sessionId: 's1' });
        expect(mockClient.setClientRateLimit).toHaveBeenCalledWith(MAC, 1000, 500, 'site-1', undefined, 1);
        expect(structured(result)).toMatchObject({ status: 'verified' });
    });

    it('sends the Mbps unit code', async () => {
        await toolHandler({ clientMac: MAC, downLimit: 10, upLimit: 5, unit: 'mbps', dryRun: false }, { sessionId: 's1' });
        expect(mockClient.setClientRateLimit).toHaveBeenCalledWith(MAC, 10, 5, undefined, undefined, 2);
    });

    it('rejects limits outside 1-1024 before any request', async () => {
        await expect(async () => toolHandler({ clientMac: MAC, downLimit: 2048, upLimit: 5 }, { sessionId: 's1' })).rejects.toThrow();
        await expect(async () => toolHandler({ clientMac: MAC, downLimit: 1.5, upLimit: 5 }, { sessionId: 's1' })).rejects.toThrow();
        expect(mockClient.getClientDetail).not.toHaveBeenCalled();
    });
});
