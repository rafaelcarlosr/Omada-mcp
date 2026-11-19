import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateScenarioTool } from '../../src/tools/createScenario.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/createScenario', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let scenarios: Record<string, unknown>[];

    beforeEach(() => {
        scenarios = [{ name: 'General', isDefault: true }];
        client = {
            listScenarios: vi.fn(async () => scenarios),
            createScenario: vi.fn((name: string) => {
                scenarios = [...scenarios, { name, isDefault: false }];
                return Promise.resolve(undefined);
            }),
        };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerCreateScenarioTool(server, client as unknown as OmadaClient);
    });

    it('previews, then creates once and verifies by name', async () => {
        expect((await handler({ payload: { name: 'Warehouse' } }, {})).structuredContent).toMatchObject({ status: 'planned' });
        expect(client.createScenario).not.toHaveBeenCalled();
        const result = await handler({ payload: { name: 'Warehouse' }, dryRun: false }, {});
        expect(client.createScenario).toHaveBeenCalledWith('Warehouse', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'Warehouse' } });
    });

    it('refuses an existing scenario and surfaces rejections', async () => {
        await expect(handler({ payload: { name: 'General' }, dryRun: false }, {})).rejects.toThrow('already exists');
        client.createScenario.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { name: 'Warehouse' }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
