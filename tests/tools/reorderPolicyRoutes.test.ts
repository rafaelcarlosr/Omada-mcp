import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerReorderPolicyRoutesTool } from '../../src/tools/reorderPolicyRoutes.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/reorderPolicyRoutes', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, Record<string, unknown>>;
    let rules: Record<string, unknown>[];

    beforeEach(() => {
        state = {
            sessionLimit: { enable: false },
            bandwidth: { enable: false, thresholdControlEnable: false, thresholdValue: 80 },
            lldp: { lldp: { enable: true } },
            remote: { remoteLog: { enable: false, port: 514, moreClientLog: false, resource: 0 } },
            ssh: { sshEnable: false, sshServerPort: 22, layer3Access: false },
            macAuth: { enable: false, ssids: [{ id: 's1', ssidId: 's1', ssidName: 'x' }] },
            macFilter: { enable: false },
            dot1x: { enable: false, guestVlanSetting: { mode: 0 } },
        };
        rules = [
            { id: 'r1', name: 'a', status: true, sourceType: 2, ip: '10.0.0.1', maxSession: 100, index: -1 },
            { id: 'r2', name: 'b', status: false, sourceType: 2, ip: '10.0.0.2', maxSession: 50, index: -1 },
        ];
        const setter = (key: string, transform: (body: Record<string, unknown>) => Record<string, unknown> = (body) => body) =>
            vi.fn((body: Record<string, unknown>) => {
                state[key] = { ...state[key], ...transform(body) };
                return Promise.resolve(undefined);
            });
        const page = (rows: Record<string, unknown>[]) => ({ data: rows, totalRows: rows.length });
        client = {
            getSessionLimit: vi.fn(async () => state.sessionLimit),
            setSessionLimit: setter('sessionLimit'),
            getBandwidthControl: vi.fn(async () => state.bandwidth),
            setBandwidthControl: setter('bandwidth'),
            getLldpSetting: vi.fn(async () => state.lldp),
            setLldpSetting: setter('lldp'),
            getRemoteLoggingSetting: vi.fn(async () => state.remote),
            setSiteRemoteLogging: setter('remote'),
            getSshSetting: vi.fn(async () => state.ssh),
            setSshSetting: setter('ssh'),
            getMacAuthSetting: vi.fn(async () => state.macAuth),
            setMacAuthSetting: setter('macAuth', (body) => ({ ...body, ssids: (body.ssids as string[]).map((id) => ({ id, ssidId: id })) })),
            getMacFilteringGeneralSetting: vi.fn(async () => state.macFilter),
            setMacFilteringGeneralSetting: setter('macFilter', (body) => (body.enable ? body : { enable: false })),
            getEapDot1xSetting: vi.fn(async () => state.dot1x),
            setEapDot1xSetting: setter('dot1x'),
            getGridSessionLimitRule: vi.fn(async () => page(rules)),
            createSessionLimitRule: vi.fn((body: Record<string, unknown>) => {
                rules = [{ id: 'r3', ...body, index: -1 }, ...rules];
                return Promise.resolve(undefined);
            }),
            updateSessionLimitRule: vi.fn((id: string, body: Record<string, unknown>) => {
                rules = rules.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteSessionLimitRule: vi.fn((id: string) => {
                rules = rules.filter((row) => row.id !== id);
                return Promise.resolve(undefined);
            }),
            reorderSessionLimitRules: vi.fn((indexes: Record<string, number>) => {
                rules = [...rules].sort((a, b) => indexes[String(a.id)] - indexes[String(b.id)]);
                return Promise.resolve(undefined);
            }),
            getGridBandwidthCtrlRule: vi.fn(async () =>
                page([
                    { id: 'b1', index: 1 },
                    { id: 'b2', index: 2 },
                ])
            ),
            reorderBandwidthControlRules: vi.fn().mockRejectedValue(new OmadaApiError(-1001, 'Invalid request parameters.')),
            getGridPolicyRouting: vi.fn(async () => page([{ id: 'p1', index: 1 }])),
            reorderPolicyRoutes: vi.fn(async () => undefined),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerReorderPolicyRoutesTool(server, client as unknown as OmadaClient);
    });

    it('sends the new order as 1-based indexes', async () => {
        client.getGridPolicyRouting.mockResolvedValue({
            data: [
                { id: 'p1', index: 1 },
                { id: 'p2', index: 2 },
            ],
            totalRows: 2,
        });
        await handler({ ids: ['p2', 'p1'], dryRun: false }, {});
        expect(client.reorderPolicyRoutes).toHaveBeenCalledWith({ p2: 1, p1: 2 }, undefined, undefined);
    });

    it('reports an unchanged order as a no-op', async () => {
        const result = await handler({ ids: ['p1'], dryRun: false }, {});
        expect(result.structuredContent).toMatchObject({ result: { noOp: true } });
        expect(client.reorderPolicyRoutes).not.toHaveBeenCalled();
    });

    it('refuses unknown IDs', async () => {
        await expect(handler({ ids: ['p1', 'x'], dryRun: false }, {})).rejects.toThrow('unknown: x');
        expect(definition.inputSchema.ids).toBeTruthy();
    });
});
