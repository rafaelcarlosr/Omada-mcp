import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateAuthSurveyTool } from '../../src/tools/createAuthSurvey.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/createAuthSurvey', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let surveys: Record<string, unknown>[];

    beforeEach(() => {
        surveys = [{ id: 's-1', name: 'old', title: 't', note: 'n', authTimeout: { authTimeout: 2 }, cardList: [], isPublished: false }];
        client = {
            listAuthSurveys: vi.fn(async () => surveys),
            createAuthSurvey: vi.fn((body: Record<string, unknown>) => {
                const { published, ...rest } = body;
                surveys = [...surveys, { ...rest, isPublished: published, id: 's-2' }];
                return Promise.resolve({ id: 's-2' });
            }),
            updateAuthSurvey: vi.fn((id: string, body: Record<string, unknown>) => {
                const { published, ...rest } = body;
                surveys = surveys.map((survey) => (survey.id === id ? { ...survey, ...rest, isPublished: published } : survey));
                return Promise.resolve(undefined);
            }),
            deleteAuthSurvey: vi.fn((id: string) => {
                surveys = surveys.filter((survey) => survey.id !== id);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCreateAuthSurveyTool(server, client as unknown as OmadaClient);
    });

    const payload = {
        title: 'Welcome',
        name: 'survey',
        note: 'Please answer',
        authTimeout: { authTimeout: 0, customTimeout: 90, customTimeoutUnit: 1 },
        cardList: [{ type: 0, required: true, title: 'Q', choices: ['A', 'B'] }],
        published: true,
    };

    it('accepts custom timeouts above 1, unlike the generated spec bound', () => {
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
        expect(() => definition.inputSchema.payload.parse({ ...payload, authTimeout: { authTimeout: 0, customTimeout: 2_000_000 } })).toThrow();
    });

    it('previews, then creates once and verifies published through isPublished', async () => {
        expect((await handler({ payload }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.createAuthSurvey).toHaveBeenCalledWith(payload, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 's-2' } });
    });

    it('refuses a duplicate name and surfaces rejections', async () => {
        await expect(handler({ payload: { ...payload, name: 'old' }, dryRun: false }, {})).rejects.toThrow('already exists');
        client.createAuthSurvey.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
