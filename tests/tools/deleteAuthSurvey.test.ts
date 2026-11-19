import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteAuthSurveyTool } from '../../src/tools/deleteAuthSurvey.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteAuthSurvey', () => {
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
        registerDeleteAuthSurveyTool(server, client as unknown as OmadaClient);
    });

    it('previews the survey with published normalized, then deletes and verifies it is gone', async () => {
        expect((await handler({ surveyId: 's-1' }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { before: { published: false } },
        });
        const result = await handler({ surveyId: 's-1', dryRun: false }, {});
        expect(client.deleteAuthSurvey).toHaveBeenCalledWith('s-1', undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown surveys and surfaces rejections', async () => {
        expect(() => definition.inputSchema.surveyId.parse('')).toThrow();
        await expect(handler({ surveyId: 'nope', dryRun: false }, {})).rejects.toThrow('No authentication survey with id "nope"');
        client.deleteAuthSurvey.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ surveyId: 's-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
