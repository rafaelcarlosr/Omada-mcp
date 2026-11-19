import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceSettingOperations, sshSettingPayloadSchema } from '../../src/omadaClient/serviceSettings.js';

const paths: Record<string, Record<string, unknown>> = Object.assign(
    {},
    ...[
        '04.1-site-network-setting-authentication',
        '04.2-site-network-setting-general',
        '04.7-site-network-setting-transmission',
        '05-site-device-config',
        '16-log',
    ].map((name) => JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths)
);

type Ops = InstanceType<typeof ServiceSettingOperations>;
const rule = { name: 'r', status: true, sourceType: 2, ip: '10.0.0.1', maxSession: 100 };

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown }[] = [
    { method: 'setSessionLimit', args: [{ enable: true }], http: 'PATCH', route: '/session-limit', url: '/session-limit', data: { enable: true } },
    { method: 'createSessionLimitRule', args: [rule], http: 'POST', route: '/session-limit/rules', url: '/session-limit/rules', data: rule },
    {
        method: 'updateSessionLimitRule',
        args: ['r1', rule],
        http: 'PATCH',
        route: '/session-limit/rules/{ruleId}',
        url: '/session-limit/rules/r1',
        data: rule,
    },
    { method: 'deleteSessionLimitRule', args: ['r1'], http: 'DELETE', route: '/session-limit/rules/{ruleId}', url: '/session-limit/rules/r1' },
    {
        method: 'reorderSessionLimitRules',
        args: [{ r1: 1 }],
        http: 'PATCH',
        route: '/session-limit/rules',
        url: '/session-limit/rules',
        data: { indexes: { r1: 1 } },
    },
    {
        method: 'setBandwidthControl',
        args: [{ enable: false }],
        http: 'PATCH',
        route: '/bandwidth-control',
        url: '/bandwidth-control',
        data: { enable: false },
    },
    {
        method: 'reorderBandwidthControlRules',
        args: [{ b1: 1 }],
        http: 'PATCH',
        route: '/bandwidth-control/rules',
        url: '/bandwidth-control/rules',
        data: { indexes: { b1: 1 } },
    },
    {
        method: 'reorderPolicyRoutes',
        args: [{ p1: 1 }],
        http: 'POST',
        route: '/routing/policy-routings/modifyIndex',
        url: '/routing/policy-routings/modifyIndex',
        data: { indexes: { p1: 1 } },
    },
    { method: 'setLldpSetting', args: [{ lldp: { enable: true } }], http: 'PATCH', route: '/lldp', url: '/lldp', data: { lldp: { enable: true } } },
    { method: 'getRemoteLoggingTip', args: [], http: 'GET', route: '/remote-logging/tip', url: '/remote-logging/tip' },
    {
        method: 'setSiteRemoteLogging',
        args: [{ remoteLog: { enable: false } }],
        http: 'PATCH',
        route: '/remote-logging',
        url: '/remote-logging',
        data: { remoteLog: { enable: false } },
    },
    {
        method: 'setSshSetting',
        args: [{ sshEnable: false, sshServerPort: 22 }],
        http: 'PUT',
        route: '/ssh',
        url: '/ssh',
        data: { sshEnable: false, sshServerPort: 22 },
    },
    {
        method: 'setMacAuthSetting',
        args: [{ enable: false, ssids: [] }],
        http: 'PATCH',
        route: '/mac-auth',
        url: '/mac-auth',
        data: { enable: false, ssids: [] },
    },
    {
        method: 'setMacFilteringGeneralSetting',
        args: [{ enable: false }],
        http: 'PATCH',
        route: '/mac-filter',
        url: '/mac-filter',
        data: { enable: false },
    },
    { method: 'setEapDot1xSetting', args: [{ enable: false }], http: 'PATCH', route: '/dot1x/eap', url: '/dot1x/eap', data: { enable: false } },
    { method: 'listEapDot1xCandidates', args: [], http: 'GET', route: '/dot1x/eap/candidates', url: '/dot1x/eap/candidates' },
    { method: 'listSwitchDot1xCandidates', args: [], http: 'GET', route: '/dot1x/candidates', url: '/dot1x/candidates' },
];

describe('omadaClient/serviceSettings', () => {
    const request = { request: vi.fn(), fetchPaginated: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 's1') };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        request.fetchPaginated.mockResolvedValue([{ mac: 'x' }]);
        operations = new ServiceSettingOperations(request as never, site as never, (path) => `/openapi/v1/cid${path}`);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, url, data }) => {
        expect(paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 's1', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            { url: `/openapi/v1/cid/sites/s1${url}`, method: http, ...(data === undefined ? {} : { data }) },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('reads every page of SNMP-incompatible devices', async () => {
        expect(paths['/openapi/v1/{omadacId}/sites/{siteId}/setting/service/snmp/incompatible-devices']?.get).toBeTruthy();
        await expect(operations.listSnmpIncompatibleDevices()).resolves.toEqual([{ mac: 'x' }]);
        expect(request.fetchPaginated).toHaveBeenCalledWith('/openapi/v1/cid/sites/s1/setting/service/snmp/incompatible-devices', {}, undefined, 100);
    });

    it('accepts SSH port 22 or 1025-65535 and validates before sending', async () => {
        expect(sshSettingPayloadSchema.parse({ sshEnable: true, sshServerPort: 22 })).toMatchObject({ sshServerPort: 22 });
        expect(() => sshSettingPayloadSchema.parse({ sshEnable: true, sshServerPort: 1000 })).toThrow('22 or within 1025-65535');
        await expect(operations.reorderPolicyRoutes({})).rejects.toThrow('At least one index is required.');
        await expect(operations.deleteSessionLimitRule(' ')).rejects.toThrow('An identifier is required.');
        await expect(operations.createSessionLimitRule({ name: 'x' } as never)).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
