import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteSurveyResultsTool } from '../../src/tools/deleteSurveyResults.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteSurveyResults', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let results: Record<string, unknown>[];

    beforeEach(() => {
        results = [{ id: 'r-1' }, { id: 'r-2' }];
        client = {
            listSurveyResults: vi.fn(async () => ({ totalRows: results.length, data: results })),
            deleteSurveyResults: vi.fn((_survey: string, ids: string[]) => {
                results = results.filter((result) => !ids.includes(String(result.id)));
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteSurveyResultsTool(server, client as unknown as OmadaClient);
    });

    it('previews, then deletes the listed answers and verifies they are gone', async () => {
        expect((await handler({ surveyId: 's-1', resultIds: ['r-1'] }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ surveyId: 's-1', resultIds: ['r-1'], dryRun: false }, {});
        expect(client.deleteSurveyResults).toHaveBeenCalledWith('s-1', ['r-1'], undefined, undefined);
        expect(client.listSurveyResults).toHaveBeenCalledWith('s-1', 1, 1000, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown answers and surfaces rejections', async () => {
        expect(() => definition.inputSchema.resultIds.parse([])).toThrow();
        client.listSurveyResults.mockResolvedValueOnce(undefined);
        await expect(handler({ surveyId: 's-1', resultIds: ['r-1'], dryRun: false }, {})).rejects.toThrow('No survey answer with id "r-1"');
        client.deleteSurveyResults.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ surveyId: 's-1', resultIds: ['r-2'], dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
