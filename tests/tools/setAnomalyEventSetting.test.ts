import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetAnomalyEventSettingTool } from '../../src/tools/setAnomalyEventSetting.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setAnomalyEventSetting', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>[];

    beforeEach(() => {
        state = [{ anomalyCode: '01003014', category: 11, enable: false, level: 2, params: {} }];
        client = {
            listAnomalySettings: vi.fn(async () => ({ data: state })),
            setAnomalyEventSetting: vi.fn((body: Record<string, unknown>) => {
                state = state.map((setting) => (setting.anomalyCode === body.anomalyCode ? { ...setting, ...body } : setting));
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetAnomalyEventSettingTool(server, client as unknown as OmadaClient);
    });

    it('previews, then applies only the sent fields and verifies them', async () => {
        expect((await handler({ anomalyCode: '01003014', enable: true }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { alreadyMatches: false },
        });
        const result = await handler({ anomalyCode: '01003014', enable: true, level: 1, params: { threshold: 3 }, siteId: 's-1', dryRun: false }, {});
        expect(client.setAnomalyEventSetting).toHaveBeenCalledWith(
            { anomalyCode: '01003014', enable: true, level: 1, params: { threshold: 3 } },
            's-1',
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown codes, empty changes and invalid levels', async () => {
        await expect(handler({ anomalyCode: 'nope', enable: true, dryRun: false }, {})).rejects.toThrow('No anomaly with code "nope"');
        await expect(handler({ anomalyCode: '01003014', dryRun: false }, {})).rejects.toThrow('Send at least one');
        expect(() => definition.inputSchema.level.parse(4)).toThrow();
        client.listAnomalySettings.mockResolvedValueOnce(undefined);
        await expect(handler({ anomalyCode: '01003014', enable: true }, {})).rejects.toThrow('No anomaly');
        client.setAnomalyEventSetting.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ anomalyCode: '01003014', level: 0, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
