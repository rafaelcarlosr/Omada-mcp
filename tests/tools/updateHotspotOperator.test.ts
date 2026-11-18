import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateHotspotOperatorTool } from '../../src/tools/updateHotspotOperator.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'frontdesk', password: 'Op3rator!', operatorRoleType: 1, selectedSites: ['site-1'] };

describe('tools/updateHotspotOperator', () => {
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
        registerUpdateHotspotOperatorTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.operatorId.parse(' ')).toThrow();
    });

    it('previews the difference without writing', async () => {
        const result = await handler({ operatorId: 'op-1', payload: { ...payload, name: 'night' } }, {});
        expect(client.updateHotspotOperator).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'op-1', alreadyMatches: false } });
    });

    it('applies once and verifies the readback', async () => {
        const result = await handler({ operatorId: 'op-1', payload: { ...payload, name: 'night' }, dryRun: false }, {});
        expect(client.updateHotspotOperator).toHaveBeenCalledWith('op-1', { ...payload, name: 'night' }, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ operatorId: 'missing', payload: { ...payload, name: 'night' } }, {})).rejects.toThrow('"missing"');
    });

    it('surfaces controller rejections', async () => {
        client.updateHotspotOperator.mockRejectedValueOnce(new OmadaApiError(-30105, 'rejected'));
        await expect(handler({ operatorId: 'op-1', payload: { ...payload, name: 'night' }, dryRun: false }, {})).rejects.toThrow(
            '(errorCode -30105): rejected'
        );
    });
});
