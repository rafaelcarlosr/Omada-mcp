import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUnblockClientTool } from '../../src/tools/unblockClient.js';

const MAC = 'AA-BB-CC-DD-EE-FF';

describe('tools/unblockClient', () => {
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
            getClientDetail: vi.fn().mockResolvedValue({ mac: MAC, name: 'phone', wireless: true, blocked: true }),
            unblockClient: vi.fn().mockResolvedValue({}),
        } as unknown as OmadaClient;
        registerUnblockClientTool(mockServer, mockClient);
    });

    const structured = (result: CallToolResult): Record<string, unknown> => result.structuredContent as Record<string, unknown>;

    it('registers the tool', () => {
        expect(registered.name).toBe('unblockClient');
        expect(registered.config?.description).toContain('Preview');
    });

    it('defaults omitted dryRun to a preview that sends nothing', async () => {
        const result = await toolHandler({ clientMac: MAC }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ mode: 'dry-run', status: 'planned' });
        expect(mockClient.unblockClient).not.toHaveBeenCalled();
    });

    it('refuses an unknown client before any write', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue(undefined as never);
        await expect(toolHandler({ ...{ clientMac: MAC }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow(`No client with MAC ${MAC}`);
        expect(mockClient.unblockClient).not.toHaveBeenCalled();
    });

    it('reports a controller rejection', async () => {
        vi.mocked(mockClient.unblockClient).mockRejectedValue(new OmadaApiError(-1001, 'Invalid request parameters.'));
        await expect(toolHandler({ ...{ clientMac: MAC }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow('errorCode -1001');
    });

    it('unblocks once and verifies the state', async () => {
        vi.mocked(mockClient.getClientDetail)
            .mockResolvedValueOnce({ mac: MAC, blocked: true } as never)
            .mockResolvedValue({ mac: MAC, blocked: false } as never);
        const result = await toolHandler({ clientMac: MAC, dryRun: false }, { sessionId: 's1' });
        expect(mockClient.unblockClient).toHaveBeenCalledTimes(1);
        expect(structured(result)).toMatchObject({ status: 'verified' });
    });
});
