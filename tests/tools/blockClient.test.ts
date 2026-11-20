import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerBlockClientTool } from '../../src/tools/blockClient.js';

const MAC = 'AA-BB-CC-DD-EE-FF';

describe('tools/blockClient', () => {
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
            getClientDetail: vi.fn().mockResolvedValue({ mac: MAC, name: 'phone', wireless: true, blocked: false }),
            blockClient: vi.fn().mockResolvedValue({}),
        } as unknown as OmadaClient;
        registerBlockClientTool(mockServer, mockClient);
    });

    const structured = (result: CallToolResult): Record<string, unknown> => result.structuredContent as Record<string, unknown>;

    it('registers the tool', () => {
        expect(registered.name).toBe('blockClient');
        expect(registered.config?.description).toContain('Preview');
    });

    it('defaults omitted dryRun to a preview that sends nothing', async () => {
        const result = await toolHandler({ clientMac: MAC }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ mode: 'dry-run', status: 'planned' });
        expect(mockClient.blockClient).not.toHaveBeenCalled();
    });

    it('refuses an unknown client before any write', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue(undefined as never);
        await expect(toolHandler({ ...{ clientMac: MAC }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow(`No client with MAC ${MAC}`);
        expect(mockClient.blockClient).not.toHaveBeenCalled();
    });

    it('reports a controller rejection', async () => {
        vi.mocked(mockClient.blockClient).mockRejectedValue(new OmadaApiError(-1001, 'Invalid request parameters.'));
        await expect(toolHandler({ ...{ clientMac: MAC }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow('errorCode -1001');
    });

    it('blocks once and verifies the blocked state', async () => {
        vi.mocked(mockClient.getClientDetail)
            .mockResolvedValueOnce({ mac: MAC, blocked: false } as never)
            .mockResolvedValue({ mac: MAC, blocked: true } as never);
        const result = await toolHandler({ clientMac: MAC, siteId: 'site-1', dryRun: false }, { sessionId: 's1' });
        expect(mockClient.blockClient).toHaveBeenCalledTimes(1);
        expect(mockClient.blockClient).toHaveBeenCalledWith(MAC, 'site-1', undefined);
        expect(structured(result)).toMatchObject({ status: 'verified', result: { writeAcknowledged: true } });
    });

    it('is a no-op for an already blocked client', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue({ mac: MAC, blocked: true } as never);
        const result = await toolHandler({ clientMac: MAC, dryRun: false }, { sessionId: 's1' });
        expect(mockClient.blockClient).not.toHaveBeenCalled();
        expect(structured(result)).toMatchObject({ result: { noOp: true } });
    });

    it('previews the current block state', async () => {
        const result = await toolHandler({ clientMac: MAC }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ result: { before: { blocked: false }, planned: { blocked: true } } });
    });
});
