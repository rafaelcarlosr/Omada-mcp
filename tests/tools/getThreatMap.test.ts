import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetThreatMapTool } from '../../src/tools/getThreatMap.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getThreatMap', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getThreatMap: vi.fn().mockResolvedValue({ data: [] }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerGetThreatMapTool(server, client as unknown as OmadaClient);
    });

    it('queries the period, joining site IDs', async () => {
        await handler({ start: 1, end: 2, severity: '0', siteIds: ['s1', 's2'] }, {});
        expect(client.getThreatMap).toHaveBeenCalledWith({ start: 1, end: 2, severity: '0', country: undefined, sites: 's1,s2' }, undefined);
        await handler({ start: 1, end: 2 }, {});
        expect(client.getThreatMap).toHaveBeenLastCalledWith({ start: 1, end: 2, severity: undefined, country: undefined }, undefined);
    });

    it('refuses an empty period', async () => {
        await expect(handler({ start: 2, end: 2 }, {})).rejects.toThrow('start must be before end.');
        expect(client.getThreatMap).not.toHaveBeenCalled();
    });
});
