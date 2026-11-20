import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerReconnectClientTool } from '../../src/tools/reconnectClient.js';

const MAC = 'AA-BB-CC-DD-EE-FF';

describe('tools/reconnectClient', () => {
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
            getClientDetail: vi
                .fn()
                .mockResolvedValue({ mac: MAC, name: 'phone', wireless: true, ssid: 'lab', apMac: 'AP', active: true, rateLimit: {} }),
            reconnectClient: vi.fn().mockResolvedValue({}),
        } as unknown as OmadaClient;
        registerReconnectClientTool(mockServer, mockClient);
    });

    const structured = (result: CallToolResult): Record<string, unknown> => result.structuredContent as Record<string, unknown>;

    it('registers the tool', () => {
        expect(registered.name).toBe('reconnectClient');
        expect(registered.config?.description).toContain('Preview');
    });

    it('defaults omitted dryRun to a preview that sends nothing', async () => {
        const result = await toolHandler({ clientMac: MAC }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({ mode: 'dry-run', status: 'planned' });
        expect(mockClient.reconnectClient).not.toHaveBeenCalled();
    });

    it('refuses an unknown client before any write', async () => {
        vi.mocked(mockClient.getClientDetail).mockResolvedValue(undefined as never);
        await expect(toolHandler({ ...{ clientMac: MAC }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow(`No client with MAC ${MAC}`);
        expect(mockClient.reconnectClient).not.toHaveBeenCalled();
    });

    it('reports a controller rejection', async () => {
        vi.mocked(mockClient.reconnectClient).mockRejectedValue(new OmadaApiError(-1001, 'Invalid request parameters.'));
        await expect(toolHandler({ ...{ clientMac: MAC }, dryRun: false }, { sessionId: 's1' })).rejects.toThrow('errorCode -1001');
    });

    it('shows the client in the preview without its other fields', async () => {
        const result = await toolHandler({ clientMac: MAC }, { sessionId: 's1' });
        expect(structured(result)).toMatchObject({
            result: { target: { mac: MAC, name: 'phone', wireless: true, ssid: 'lab', apMac: 'AP', active: true } },
        });
        expect((structured(result).result as { target: Record<string, unknown> }).target).not.toHaveProperty('rateLimit');
    });

    it('sends the reconnect once', async () => {
        const result = await toolHandler({ clientMac: MAC, siteId: 'site-1', dryRun: false }, { sessionId: 's1' });
        expect(mockClient.reconnectClient).toHaveBeenCalledWith(MAC, 'site-1', undefined);
        expect(structured(result)).toMatchObject({ status: 'submitted', result: { writeAcknowledged: true } });
    });
});
