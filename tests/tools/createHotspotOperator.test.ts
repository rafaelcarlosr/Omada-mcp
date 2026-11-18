import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateHotspotOperatorTool } from '../../src/tools/createHotspotOperator.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'frontdesk', password: 'Op3rator!', operatorRoleType: 1, selectedSites: ['site-1'] };

describe('tools/createHotspotOperator', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let operators: Record<string, unknown>[];

    beforeEach(() => {
        operators = [{ id: 'op-1', name: 'night', password: 'old-secret', operatorRoleType: 0, selectedSites: ['site-1'] }];
        client = {
            listHotspotOperators: vi.fn(async () => operators),
            createHotspotOperator: vi.fn((body: Record<string, unknown>) => {
                operators = [...operators, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updateHotspotOperator: vi.fn((id: string, body: Record<string, unknown>) => {
                operators = operators.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteHotspotOperator: vi.fn((id: string) => {
                operators = operators.filter((row) => row.id !== id);
                return Promise.resolve({});
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCreateHotspotOperatorTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews by default without writing', async () => {
        const result = await handler({ payload: payload }, {});
        expect(client.createHotspotOperator).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true } });
    });

    it('creates once and verifies the readback', async () => {
        const result = await handler({ payload: payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.createHotspotOperator).toHaveBeenCalledTimes(1);
        expect(client.createHotspotOperator).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'new-1' } });
    });

    it('never returns the clear-text password', async () => {
        const result = await handler({ payload, dryRun: false }, {});
        expect(JSON.stringify(result)).not.toContain('Op3rator!');
    });

    it('surfaces controller rejections', async () => {
        client.createHotspotOperator.mockRejectedValueOnce(new OmadaApiError(-30105, 'rejected'));
        await expect(handler({ payload: payload, dryRun: false }, {})).rejects.toThrow('(errorCode -30105): rejected');
    });
});
