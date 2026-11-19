import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteScenarioTool } from '../../src/tools/deleteScenario.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteScenario', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let scenarios: Record<string, unknown>[];

    beforeEach(() => {
        scenarios = [
            { name: 'General', isDefault: true },
            { name: 'Warehouse', isDefault: false },
        ];
        client = {
            listScenarios: vi.fn(async () => scenarios),
            deleteScenario: vi.fn((name: string) => {
                scenarios = scenarios.filter((scenario) => scenario.name !== name);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteScenarioTool(server, client as unknown as OmadaClient);
    });

    it('validates the name', () => {
        expect(() => definition.inputSchema.name.parse('')).toThrow();
    });

    it('previews, then deletes a custom scenario and verifies it is gone', async () => {
        expect((await handler({ name: 'Warehouse' }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ name: 'Warehouse', dryRun: false }, {});
        expect(client.deleteScenario).toHaveBeenCalledWith('Warehouse', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses built-in and unknown scenarios', async () => {
        await expect(handler({ name: 'General', dryRun: false }, {})).rejects.toThrow('built-in scenario');
        await expect(handler({ name: 'Nope', dryRun: false }, {})).rejects.toThrow('No scenario with id "Nope"');
        expect(client.deleteScenario).not.toHaveBeenCalled();
    });

    it('surfaces a scenario still in use', async () => {
        client.deleteScenario.mockRejectedValueOnce(new OmadaApiError(-30041, 'This site scenario in use cannot be deleted.'));
        await expect(handler({ name: 'Warehouse', dryRun: false }, {})).rejects.toThrow('(errorCode -30041)');
    });
});
