import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteServiceTypeTool } from '../../src/tools/deleteServiceType.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteServiceType', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [
            {
                id: 'st-1',
                name: 'old',
                protocol: 1,
                sourceStartPort: 0,
                sourceEndPort: 65535,
                destStartPort: 53,
                destEndPort: 53,
                defaultProfile: false,
            },
            { id: 'BI-ST-FTP', name: 'FTP', protocol: 0, defaultProfile: true },
        ];
        client = {
            listServiceType: vi.fn(async () => rows),
            createServiceType: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve('new-1');
            }),
            updateServiceType: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteServiceType: vi.fn((id: string) => {
                rows = rows.filter((row) => row.id !== id);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteServiceTypeTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.serviceTypeId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ serviceTypeId: 'st-1' }, {});
        expect(client.deleteServiceType).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'st-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ serviceTypeId: 'st-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteServiceType).toHaveBeenCalledWith('st-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ serviceTypeId: 'missing', dryRun: false }, {})).rejects.toThrow('No service type with id "missing"');
    });

    it('refuses built-in profiles', async () => {
        await expect(handler({ serviceTypeId: 'BI-ST-FTP', dryRun: false }, {})).rejects.toThrow('built-in');
        expect(client.deleteServiceType).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.deleteServiceType.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ serviceTypeId: 'st-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
