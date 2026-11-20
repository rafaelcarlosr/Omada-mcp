import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetRoutingTableTool } from '../../src/tools/getRoutingTable.js';
import * as loggerModule from '../../src/utils/logger.js';

describe('tools/getRoutingTable', () => {
    let mockServer: McpServer;
    let mockClient: OmadaClient;
    let toolHandler: (args: unknown, extra: { sessionId?: string }) => Promise<unknown>;

    beforeEach(() => {
        mockServer = {
            registerTool: vi.fn((name, schema, handler) => {
                toolHandler = handler;
            }),
        } as unknown as McpServer;

        mockClient = {
            getRoutingTable: vi.fn(),
        } as unknown as OmadaClient;

        vi.spyOn(loggerModule.logger, 'info').mockImplementation(() => {
            // Mock implementation
        });
        vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {
            // Mock implementation
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('registerGetRoutingTableTool', () => {
        it('should register the getRoutingTable tool with correct schema', () => {
            registerGetRoutingTableTool(mockServer, mockClient);
            expect(mockServer.registerTool).toHaveBeenCalledWith('getRoutingTable', expect.any(Object), expect.any(Function));
        });

        it('should execute successfully with type=gateway', async () => {
            const mockData = { result: { data: [] } };
            (mockClient.getRoutingTable as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
            registerGetRoutingTableTool(mockServer, mockClient);
            const result = await toolHandler({ type: 'gateway' }, { sessionId: 'test-session' });
            expect(mockClient.getRoutingTable).toHaveBeenCalledWith('gateway', undefined, undefined);
            expect(result).toEqual({
                structuredContent: mockData,
                content: [{ type: 'text', text: JSON.stringify(mockData, null, 2) }],
            });
        });

        it('should execute successfully with type=switch and siteId', async () => {
            const mockData = { result: { data: [{ destination: '10.0.0.0/8' }] } };
            (mockClient.getRoutingTable as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
            registerGetRoutingTableTool(mockServer, mockClient);
            const result = await toolHandler({ type: 'switch', siteId: 'test-site' }, { sessionId: 'test-session' });
            expect(mockClient.getRoutingTable).toHaveBeenCalledWith('switch', 'test-site', undefined);
            expect(result).toEqual({
                structuredContent: mockData,
                content: [{ type: 'text', text: JSON.stringify(mockData, null, 2) }],
            });
        });

        it('accepts only the documented gateway and switch types', () => {
            registerGetRoutingTableTool(mockServer, mockClient);
            const [, definition] = vi.mocked(mockServer.registerTool).mock.calls[0] as unknown as [
                string,
                { inputSchema: Record<string, z.ZodTypeAny> },
            ];
            expect(definition.inputSchema.type.safeParse('gateway').success).toBe(true);
            expect(definition.inputSchema.type.safeParse('switch').success).toBe(true);
            expect(definition.inputSchema.type.safeParse('ospf').success).toBe(false);
        });

        it('should handle errors', async () => {
            const error = new Error('API error');
            (mockClient.getRoutingTable as ReturnType<typeof vi.fn>).mockRejectedValue(error);
            registerGetRoutingTableTool(mockServer, mockClient);
            await expect(toolHandler({ type: 'gateway' }, { sessionId: 'test-session' })).rejects.toThrow('API error');
            expect(loggerModule.logger.error).toHaveBeenCalledWith('Tool failed', {
                tool: 'getRoutingTable',
                sessionId: 'test-session',
                error: 'API error',
            });
        });
    });
});
