import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetMacAuthSettingTool } from '../../src/tools/setMacAuthSetting.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setMacAuthSetting', () => {
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
        registerSetMacAuthSettingTool(server, client as unknown as OmadaClient);
    });

    it('enables MAC authentication with defaults for the flags and verifies', async () => {
        const result = await handler({ changes: { enable: true, radiusProfileId: 'rad', ssids: ['s1'], macFormat: 0 }, dryRun: false }, {});
        expect(client.setMacAuthSetting).toHaveBeenCalledWith(
            { enable: true, ssids: ['s1'], radiusProfileId: 'rad', mabEnable: false, emptyPwdEnable: false, macFormat: 0 },
            undefined,
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('keeps stored flags, verifies only the switch when off, and refuses incomplete enables', async () => {
        state.macAuth = { ...state.macAuth, mabEnable: true };
        await handler({ changes: { enable: true, radiusProfileId: 'rad' }, dryRun: false }, {});
        expect(client.setMacAuthSetting).toHaveBeenLastCalledWith(
            expect.objectContaining({ mabEnable: true, emptyPwdEnable: false }),
            undefined,
            undefined
        );
        expect((await handler({ changes: { enable: false }, dryRun: false }, {})).structuredContent).toMatchObject({ status: 'verified' });
        state.macAuth = { enable: false, ssids: [] };
        await expect(handler({ changes: { enable: true, radiusProfileId: 'rad' }, dryRun: false }, {})).rejects.toThrow('at least one SSID');
        client.getMacAuthSetting.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
        await expect(handler({ changes: { enable: false, ssids: [] } }, {})).resolves.toBeTruthy();
        state.macAuth = { enable: false, ssids: ['raw'] };
        await expect(handler({ changes: { enable: false } }, {})).resolves.toBeTruthy();
        expect(() => definition.inputSchema.changes.parse({})).toThrow('At least one change is required.');
    });
});
