import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateSiteTagTool } from '../../src/tools/updateSiteTag.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/updateSiteTag', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let tags: Record<string, unknown>[];

    beforeEach(() => {
        tags = [{ tagId: 't-1', name: 'retail' }];
        client = {
            listSiteTags: vi.fn(async () => tags),
            createSiteTag: vi.fn((body: { name: string }) => {
                tags = [...tags, { tagId: 't-2', name: body.name }];
                return Promise.resolve({ tagId: 't-2', name: body.name });
            }),
            updateSiteTag: vi.fn((tagId: string, name: string) => {
                tags = tags.map((tag) => (tag.tagId === tagId ? { ...tag, name } : tag));
                return Promise.resolve(undefined);
            }),
            deleteSiteTag: vi.fn((tagId: string) => {
                tags = tags.filter((tag) => tag.tagId !== tagId);
                return Promise.resolve(undefined);
            }),
        };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerUpdateSiteTagTool(server, client as unknown as OmadaClient);
    });

    it('previews, then renames once and verifies by readback', async () => {
        expect((await handler({ tagId: 't-1', payload: { name: 'shops' } }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ tagId: 't-1', payload: { name: 'shops' }, dryRun: false }, {});
        expect(client.updateSiteTag).toHaveBeenCalledWith('t-1', 'shops', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown tags and surfaces rejections', async () => {
        await expect(handler({ tagId: 'nope', payload: { name: 'x' }, dryRun: false }, {})).rejects.toThrow('No site tag with id "nope"');
        client.updateSiteTag.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ tagId: 't-1', payload: { name: 'shops' }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
