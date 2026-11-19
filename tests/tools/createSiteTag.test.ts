import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateSiteTagTool } from '../../src/tools/createSiteTag.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/createSiteTag', () => {
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
        registerCreateSiteTagTool(server, client as unknown as OmadaClient);
    });

    it('previews, then creates once and verifies by readback', async () => {
        expect((await handler({ payload: { name: 'office' } }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ payload: { name: 'office' }, dryRun: false }, {});
        expect(client.createSiteTag).toHaveBeenCalledWith({ name: 'office' }, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 't-2' } });
    });

    it('refuses a duplicate name and surfaces rejections', async () => {
        await expect(handler({ payload: { name: 'retail' }, dryRun: false }, {})).rejects.toThrow('already exists');
        client.createSiteTag.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { name: 'office' }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
