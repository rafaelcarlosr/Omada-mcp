import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListCountryThreatsTool } from '../../src/tools/listCountryThreats.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listCountryThreats', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listCountryThreats: vi.fn().mockResolvedValue({ data: [] }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListCountryThreatsTool(server, client as unknown as OmadaClient);
    });

    it('maps paging and sites onto the controller query', async () => {
        await handler({ country: 'KP', startTime: 1, endTime: 2, page: 2, pageSize: 5, siteIds: ['s1'] }, {});
        expect(client.listCountryThreats).toHaveBeenCalledWith(
            { country: 'KP', startTime: 1, endTime: 2, severity: undefined, searchKey: undefined, currentPage: 2, currentPageSize: 5, sites: 's1' },
            undefined
        );
        await handler({ country: 'KP', startTime: 1, endTime: 2 }, {});
        expect(client.listCountryThreats).toHaveBeenLastCalledWith(expect.objectContaining({ currentPage: 1, currentPageSize: 10 }), undefined);
    });

    it('refuses an empty period', async () => {
        await expect(handler({ country: 'KP', startTime: 3, endTime: 2 }, {})).rejects.toThrow('startTime must be before endTime.');
    });
});
