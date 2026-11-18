import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteHotspotOperatorTool } from '../../src/tools/deleteHotspotOperator.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteHotspotOperator', () => {
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
        registerDeleteHotspotOperatorTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.operatorId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ operatorId: 'op-1' }, {});
        expect(client.deleteHotspotOperator).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'op-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ operatorId: 'op-1', dryRun: false }, {});
        expect(client.deleteHotspotOperator).toHaveBeenCalledWith('op-1', undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('keeps the stored password out of the preview', async () => {
        const result = await handler({ operatorId: 'op-1' }, {});
        expect(JSON.stringify(result.structuredContent)).not.toContain('old-secret');
    });

    it('surfaces controller rejections', async () => {
        client.deleteHotspotOperator.mockRejectedValueOnce(new OmadaApiError(-30105, 'rejected'));
        await expect(handler({ operatorId: 'op-1', dryRun: false }, {})).rejects.toThrow('(errorCode -30105): rejected');
    });
});
