import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerCreateGatewayAclTool } from '../../src/tools/createGatewayAcl.js';

describe('tools/createGatewayAcl', () => {
    let mockServer: McpServer;
    let mockClient: OmadaClient;
    let toolHandler: (args: unknown, extra: { sessionId?: string }) => Promise<CallToolResult>;

    const payload = {
        description: 'Guests drop WAN',
        status: true,
        policy: 0,
        protocols: [6],
        sourceIds: ['net-guests'],
        sourceType: 0,
        destinationType: 0,
        direction: { lanToWan: true },
        stateMode: 0,
        syslog: false,
    };

    beforeEach(() => {
        mockServer = {
            registerTool: vi.fn((name, schema, handler) => {
                toolHandler = (args, extra) => handler(z.object(schema.inputSchema).parse(args), extra);
            }),
        } as unknown as McpServer;

        mockClient = {
            listOsgAcls: vi.fn().mockResolvedValue([]),
            createOsgAcl: vi.fn().mockResolvedValue({}),
        } as unknown as OmadaClient;
    });

    it('returns a dry-run preview', async () => {
        registerCreateGatewayAclTool(mockServer, mockClient);

        const result = await toolHandler({ payload, dryRun: true }, { sessionId: 's1' });

        expect(mockClient.createOsgAcl).not.toHaveBeenCalled();
        expect(result).toEqual({
            content: [{ type: 'text', text: expect.any(String) }],
            structuredContent: {
                action: 'create-gateway-acl',
                target: 'default-site',
                mode: 'dry-run',
                status: 'planned',
                summary: 'Planned gateway ACL creation.',
                result: { accepted: true, dryRun: true, plannedAcl: payload },
            },
        });
        expect(JSON.parse(result.content[0].text as string)).toEqual(result.structuredContent);
    });

    it('creates the gateway ACL once and verifies it on readback', async () => {
        vi.mocked(mockClient.listOsgAcls)
            .mockResolvedValueOnce([{ id: 'old', description: 'Guests drop WAN' }] as never)
            .mockResolvedValue([
                { id: 'old', description: 'Guests drop WAN' },
                { id: 'acl-1', ...payload },
            ] as never);
        registerCreateGatewayAclTool(mockServer, mockClient);

        const result = await toolHandler({ dryRun: false, payload, siteId: 'site-1' }, { sessionId: 's1' });

        expect(mockClient.createOsgAcl).toHaveBeenCalledTimes(1);
        expect(mockClient.createOsgAcl).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({
            status: 'verified',
            result: { writeAcknowledged: true, aclId: 'acl-1', verification: { status: 'verified' } },
        });
    });

    it('reports a mismatch when the created rule reads back differently', async () => {
        vi.mocked(mockClient.listOsgAcls)
            .mockResolvedValueOnce([] as never)
            .mockResolvedValue([{ id: 'acl-1', ...payload, policy: 1 }] as never);
        registerCreateGatewayAclTool(mockServer, mockClient);

        const result = await toolHandler({ dryRun: false, payload }, { sessionId: 's1' });

        expect(result.structuredContent).toMatchObject({ status: 'mismatch', result: { aclId: 'acl-1' } });
    });

    it('reports the controller rejection without verifying', async () => {
        const { OmadaApiError } = await import('../../src/omadaClient/request.js');
        vi.mocked(mockClient.createOsgAcl).mockRejectedValue(new OmadaApiError(-1001, 'Invalid Destination Type.'));
        registerCreateGatewayAclTool(mockServer, mockClient);

        await expect(toolHandler({ dryRun: false, payload }, { sessionId: 's1' })).rejects.toThrow(
            'The controller rejected the gateway ACL creation (errorCode -1001): Invalid Destination Type.'
        );
    });
    it('defaults omitted dryRun to preview through the registered schema', async () => {
        registerCreateGatewayAclTool(mockServer, mockClient);
        const result = (await toolHandler({ payload }, { sessionId: 'preview' })) as {
            content: { text: string }[];
            structuredContent: Record<string, unknown>;
        };
        const summary = JSON.parse(result.content[0].text);
        expect(summary).toMatchObject({ mode: 'dry-run', status: 'planned' });
        expect(result.structuredContent).toEqual(expect.objectContaining(summary));
        for (const [name, operation] of Object.entries(mockClient)) {
            if (!/^(get|list|resolve)/.test(name)) expect(operation).not.toHaveBeenCalled();
        }
    });
});
