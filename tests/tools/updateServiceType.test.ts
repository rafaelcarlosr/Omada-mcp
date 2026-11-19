import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateServiceTypeTool } from '../../src/tools/updateServiceType.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { name: 'ping', protocol: 3, type: 8, code: 0 };

describe('tools/updateServiceType', () => {
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
        registerUpdateServiceTypeTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.serviceTypeId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ serviceTypeId: 'st-1', payload }, {});
        expect(client.updateServiceType).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'st-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ serviceTypeId: 'st-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateServiceType).toHaveBeenCalledWith('st-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ serviceTypeId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No service type with id "missing"');
    });

    it('refuses built-in profiles', async () => {
        await expect(handler({ serviceTypeId: 'BI-ST-FTP', payload, dryRun: false }, {})).rejects.toThrow('built-in');
        expect(client.updateServiceType).not.toHaveBeenCalled();
    });

    it('surfaces controller rejections', async () => {
        client.updateServiceType.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ serviceTypeId: 'st-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
