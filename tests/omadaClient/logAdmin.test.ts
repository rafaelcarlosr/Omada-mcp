import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LogAdminOperations } from '../../src/omadaClient/logAdmin.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['16-log', '03-device'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof LogAdminOperations>;
const selection = { logIds: ['l1'], startTime: 1, endTime: 2 };
const selectionBody = { logs: ['l1'], selectType: 'include', startTime: 1, endTime: 2 };
const notifications = { webhookConfig: { webhookEnable: false }, alertNotifications: [{ key: 'A', shortMsg: 'a' }], eventNotifications: [] };
const audit = { webhookConfig: { webhookEnable: false }, auditLogNotifications: [{ key: 'ACCOUNT', webhook: true }] };

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; version?: string; data?: unknown; params?: unknown }[] =
    [
        {
            method: 'listApSsidOverrideAuditLogs',
            args: ['AA-BB-CC-DD-EE-02', 1, 10, 's1'],
            http: 'GET',
            route: '/sites/{siteId}/audit-logs/{apMac}/ssid-overrides',
            url: '/sites/s1/audit-logs/AA-BB-CC-DD-EE-02/ssid-overrides',
            params: { page: 1, pageSize: 10 },
        },
        {
            method: 'listFailedUpgradeDevices',
            args: ['u1', 1, 10],
            http: 'GET',
            route: '/logs/{upgradeLogId}/upgrade/overview/failed-devices',
            url: '/logs/u1/upgrade/overview/failed-devices',
            params: { page: 1, pageSize: 10 },
        },
        {
            method: 'getFailedUpgradeFirmware',
            args: ['u1'],
            http: 'GET',
            route: '/logs/{upgradeLogId}/upgrade/overview/failed-model-firmware',
            url: '/logs/u1/upgrade/overview/failed-model-firmware',
        },
        {
            method: 'setGlobalLogNotifications',
            args: [notifications],
            http: 'PATCH',
            route: '/log-notification',
            url: '/log-notification',
            version: 'v2',
            data: notifications,
        },
        {
            method: 'setSiteLogNotifications',
            args: [notifications, 's1'],
            http: 'PATCH',
            route: '/sites/{siteId}/site/log-notification',
            url: '/sites/s1/site/log-notification',
            version: 'v2',
            data: notifications,
        },
        {
            method: 'setGlobalAuditNotifications',
            args: [audit],
            http: 'PATCH',
            route: '/audit-notification',
            url: '/audit-notification',
            data: audit,
        },
        {
            method: 'setSiteAuditNotifications',
            args: [audit, 's1'],
            http: 'PATCH',
            route: '/sites/{siteId}/site/audit-notification',
            url: '/sites/s1/site/audit-notification',
            data: audit,
        },
        { method: 'resetGlobalLogNotifications', args: [], http: 'POST', route: '/reset/log-notification', url: '/reset/log-notification' },
        {
            method: 'resetSiteLogNotifications',
            args: ['s1'],
            http: 'POST',
            route: '/sites/{siteId}/site/reset/log-notification',
            url: '/sites/s1/site/reset/log-notification',
        },
        {
            method: 'resolveSiteAlerts',
            args: [selection, 's1'],
            http: 'POST',
            route: '/sites/{siteId}/logs/alerts/resolve',
            url: '/sites/s1/logs/alerts/resolve',
            data: selectionBody,
        },
        {
            method: 'deleteSiteEventLogs',
            args: [selection, 's1'],
            http: 'DELETE',
            route: '/sites/{siteId}/logs/events/delete',
            url: '/sites/s1/logs/events/delete',
            data: selectionBody,
        },
        {
            method: 'deleteSiteAlertLogs',
            args: [selection, 's1'],
            http: 'DELETE',
            route: '/sites/{siteId}/logs/alerts/delete',
            url: '/sites/s1/logs/alerts/delete',
            data: selectionBody,
        },
        {
            method: 'deleteGlobalEventLogs',
            args: [selection],
            http: 'DELETE',
            route: '/logs/events/delete',
            url: '/logs/events/delete',
            data: selectionBody,
        },
        {
            method: 'deleteGlobalAlertLogs',
            args: [selection],
            http: 'DELETE',
            route: '/logs/alerts/delete',
            url: '/logs/alerts/delete',
            data: selectionBody,
        },
    ];

describe('omadaClient/logAdmin', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string, version = 'v1') => `/openapi/${version}/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new LogAdminOperations(request as never, site as never, buildPath);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, url, version = 'v1', data, params }) => {
        expect(spec.paths[`/openapi/${version}/{omadacId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args)).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            {
                url: `/openapi/${version}/cid${url}`,
                method: http,
                ...(data === undefined ? {} : { data }),
                ...(params === undefined ? {} : { params }),
            },
            true,
            undefined
        );
    });

    it('never sends "all" selections and rejects invalid input before sending', async () => {
        await expect(operations.deleteSiteEventLogs({ logIds: [], startTime: 1, endTime: 2 })).rejects.toThrow('At least one log ID is required.');
        await expect(operations.deleteGlobalAlertLogs({ logIds: ['l1'], startTime: 2, endTime: 1 })).rejects.toThrow(
            'startTime must be before endTime.'
        );
        await expect(operations.setGlobalLogNotifications({} as never)).rejects.toThrow();
        await expect(operations.listApSsidOverrideAuditLogs('nope', 1, 10)).rejects.toThrow('A valid MAC address is required.');
        await expect(operations.getFailedUpgradeFirmware(' ')).rejects.toThrow('An identifier is required.');
        expect(request.request).not.toHaveBeenCalled();
    });
});
