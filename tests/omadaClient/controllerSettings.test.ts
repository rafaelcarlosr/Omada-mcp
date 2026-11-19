import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ControllerSettingOperations,
    clientDetailPayloadSchema,
    controllerLoggingPayloadSchema,
    generalSettingsPayloadSchema,
    radiusProxyPayloadSchema,
    remoteLoggingPayloadSchema,
    uiInterfacePayloadSchema,
} from '../../src/omadaClient/controllerSettings.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['03-device', '04.2-site-network-setting-general', '14-maintenance', '21-global-setting'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof ControllerSettingOperations>;

const hook = { name: 'h', urlList: ['https://example.com/a'], retryPolicy: 0, template: 0 };
const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; data?: unknown; params?: unknown }[] = [
    {
        method: 'setClientActiveTimeout',
        args: [{ clientActiveTimeoutMin: 5 }],
        http: 'PATCH',
        route: '/controller/setting/active-timeout',
        data: { clientActiveTimeoutMin: 5 },
    },
    {
        method: 'setControllerRetention',
        args: [{ clientsDataEnable: false }],
        http: 'PATCH',
        route: '/controller/setting/retention',
        data: { clientsDataEnable: false },
    },
    { method: 'setDataRetention', args: [{ clientsDataEnable: false }], http: 'PATCH', route: '/retention', data: { clientsDataEnable: false } },
    {
        method: 'setDeviceAccessManagement',
        args: [{ webControlHttp: true }],
        http: 'PATCH',
        route: '/controller/setting/services/device-access',
        data: { webControlHttp: true },
    },
    { method: 'setUiInterface', args: [{ refreshRate: 2 }], http: 'PATCH', route: '/controller/setting/ui-interface', data: { refreshRate: 2 } },
    {
        method: 'setExperienceImprovement',
        args: [{ expImprove: false }],
        http: 'PATCH',
        route: '/global/controller/setting/exp-improve',
        data: { expImprove: false },
    },
    {
        method: 'setGeneralSettings',
        args: [{ name: 'lab', timeZone: 'UTC', region: 'Brazil' }],
        http: 'PATCH',
        route: '/global/controller/setting/general',
        data: { name: 'lab', timeZone: 'UTC', region: 'Brazil' },
    },
    {
        method: 'setRadiusProxy',
        args: [{ enable: false, port: 1812 }],
        http: 'PATCH',
        route: '/global/controller/setting/network/radius-proxy',
        data: { enable: false, port: 1812 },
    },
    {
        method: 'setRadiusServer',
        args: [{ enable: false, authServerPort: 1812, secret: 'lab-secret-1', tunnelReplyEnable: false, serverAddressType: 0 }],
        http: 'PATCH',
        route: '/global/controller/setting/network/radius-server',
        data: { enable: false, authServerPort: 1812, secret: 'lab-secret-1', tunnelReplyEnable: false, serverAddressType: 0 },
    },
    {
        method: 'setRemoteLogging',
        args: [{ enable: false, port: 514 }],
        http: 'PATCH',
        route: '/global/controller/setting/syslog',
        data: { enable: false, port: 514 },
    },
    { method: 'setControllerLogging', args: [{ type: 'AUTO' }], http: 'PATCH', route: '/system/setting/logging', data: { type: 'AUTO' } },
    { method: 'getClientRecognition', args: [], http: 'GET', route: '/controller/setting/client-recognition' },
    {
        method: 'setClientRecognition',
        args: [{ enable: true }],
        http: 'PATCH',
        route: '/controller/setting/client-recognition',
        data: { enable: true },
    },
    { method: 'getClientDetailInformation', args: [], http: 'GET', route: '/client-detail-information' },
    {
        method: 'setClientDetailInformation',
        args: [{ clientRecognitionEnable: true, clientHealthEnable: true, clientHistoryEnable: false, clientDataTrendEnable: false }],
        http: 'PATCH',
        route: '/client-detail-information',
        data: { clientRecognitionEnable: true, clientHealthEnable: true, clientHistoryEnable: false, clientDataTrendEnable: false },
    },
    { method: 'getControllerDstInfo', args: [], http: 'GET', route: '/dst-info' },
    { method: 'getPrivacyPolicyStatus', args: [], http: 'GET', route: '/privacy-policy' },
    { method: 'getUpgradePort', args: [], http: 'GET', route: '/system/setting/upgrade-port' },
    { method: 'listGlobalGatewayWanStatus', args: [1, 10], http: 'GET', route: '/global/gateways/wan-status', params: { page: 1, pageSize: 10 } },
    { method: 'createWebhook', args: [hook], http: 'POST', route: '/webhook/settings', data: hook },
    {
        method: 'updateWebhook',
        args: ['w1', { urlList: ['https://example.com/a'], retryPolicy: 0, template: 0 }],
        http: 'PATCH',
        route: '/webhook/settings/{webhookId}',
        data: { urlList: ['https://example.com/a'], retryPolicy: 0, template: 0 },
    },
    { method: 'deleteWebhook', args: ['w1'], http: 'DELETE', route: '/webhook/settings/{webhookId}' },
    {
        method: 'testWebhook',
        args: ['w1', { name: 'h', urlList: ['https://example.com/a'], template: 0 }],
        http: 'POST',
        route: '/webhook/settings/{webhookId}',
        data: { name: 'h', urlList: ['https://example.com/a'], template: 0 },
    },
    {
        method: 'sendTestMail',
        args: [{ smtpServer: 's', port: 25, sslEnable: false, authEnable: false }],
        http: 'POST',
        route: '/settings/test-mail',
        data: { smtpServer: 's', port: 25, sslEnable: false, authEnable: false },
    },
    { method: 'checkControllerUpdate', args: [{ channel: 0 }], http: 'POST', route: '/system/setting/channel-update', data: { channel: 0 } },
];

describe('omadaClient/controllerSettings', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string) => `/openapi/v1/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new ControllerSettingOperations(request as never, site as never, buildPath);
    });

    it.each(cases)('$method sends $http to the documented route', async ({ method, args, http, route, data, params }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        const url = `/openapi/v1/cid${route.replace('{webhookId}', 'w1')}`;
        expect(request.request).toHaveBeenCalledWith(
            { url, method: http, ...(data === undefined ? {} : { data }), ...(params === undefined ? {} : { params }) },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('reads the site DST of the given or default site', async () => {
        expect(spec.paths['/openapi/v1/{omadacId}/sites/{siteId}/dst-info']?.get).toBeTruthy();
        await operations.getSiteDstInfo();
        expect(request.request).toHaveBeenLastCalledWith({ url: '/openapi/v1/cid/sites/site-1/dst-info', method: 'GET' }, true, undefined);
    });

    it('rejects invalid input before sending', async () => {
        await expect(operations.deleteWebhook(' ')).rejects.toThrow('An identifier is required.');
        await expect(operations.setClientActiveTimeout({ clientActiveTimeoutMin: 20 })).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });

    describe('payload schemas', () => {
        it('keeps RADIUS proxy options and syslog hosts only while enabled', () => {
            expect(() => radiusProxyPayloadSchema.parse({ enable: false, port: 1812, requireMessageAuthenticator: true })).toThrow(
                'kept only while enable'
            );
            expect(radiusProxyPayloadSchema.parse({ enable: true, port: 1812, limitProxyState: false })).toBeTruthy();
            expect(() => remoteLoggingPayloadSchema.parse({ enable: true, port: 514 })).toThrow('host is required');
            expect(() => remoteLoggingPayloadSchema.parse({ enable: false, host: '192.0.2.1', port: 514 })).toThrow('kept only while enable');
        });

        it('requires every module level with CUSTOM logging and none with AUTO', () => {
            expect(() => controllerLoggingPayloadSchema.parse({ type: 'AUTO', logModule: 'DEBUG' })).toThrow('applies only with type CUSTOM');
            expect(() => controllerLoggingPayloadSchema.parse({ type: 'CUSTOM', logModule: 'DEBUG' })).toThrow('is required with type CUSTOM');
            expect(() => controllerLoggingPayloadSchema.parse({})).toThrow();
        });

        it('requires all four client detail switches and accepts only writable UI and DST fields', () => {
            expect(() => clientDetailPayloadSchema.parse({ clientHealthEnable: false })).toThrow();
            expect(() => uiInterfacePayloadSchema.parse({})).toThrow('Send at least one');
            expect(() => generalSettingsPayloadSchema.parse({ name: 'a', timeZone: 'UTC', region: 'Brazil', dst: { nextStart: 1 } })).toThrow();
        });
    });
});
