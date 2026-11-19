import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { ssidSectionSchema } from '../omadaClient/wireless.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings, toRecords } from './resourceMutationShared.js';
import { mergedSsidSection, ssidSectionOf } from './wirelessShared.js';

const inputSchema = siteInputSchema.extend({
    ssidId: z.string().trim().min(1).describe('SSID ID from listAllSsids.'),
    configType: ssidSectionSchema.describe(
        'Section to change: band-steer {mode}, dhcp-option (Option 82), enable {ssidEnable}, hotspotv2, load-balance, mac-filter, multicast-config, rate-control, rate-limit {clientRateLimit, ssidRateLimit}, wifi-calling, wlan-schedule.'
    ),
    changes: z
        .record(z.string(), z.unknown())
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe(
            'Fields of the official section schema (e.g. UpdateSsidMultiCastOpenApiVO) to change; the others keep their current values. Enabling DHCP Option 82 needs format, delimiter, circuitId and remoteId; enabling 2.4/5 GHz rate control needs its densities, clientRatesRequire and sendBeacons.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSsidConfig' | 'listAllSsids' | 'setSsidRateControl' | 'setSsidSection'>;

export function registerSetSsidConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSsidConfig',
        {
            description:
                'Change one configuration section of an SSID by ID (band steering, DHCP Option 82, enable/disable, Hotspot 2.0, load balance, MAC filter, multicast, rate control, rate limits, Wi-Fi Calling, WLAN schedule). Unlisted fields keep their current values. Changes can disconnect wireless clients. Defaults to a preview; set dryRun:false to apply once and verify by readback (Hotspot 2.0 cannot be read back).',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSsidConfig',
            mutationSummary('set-ssid-config', (args) => `${String(args.ssidId)} ${String(args.configType)}`),
            async ({ ssidId, configType, changes, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> =>
                    ssidSectionOf(await client.getSsidConfig(ssidId, siteId, customHeaders), configType) ?? {};
                const body = mergedSsidSection(configType, await read(), changes);
                let wlanId: string | undefined;
                if (configType === 'rate-control') {
                    // Controller 6.3 fails the by-ID rate-control route, so it is sent through the SSID's WLAN group.
                    const ssid = toRecords(await client.listAllSsids(siteId, customHeaders)).find(
                        (entry) => String(entry.ssidId ?? entry.id) === ssidId
                    );
                    if (!ssid?.wlanId) throw new Error(`No SSID with id "${ssidId}" in this site. No request was sent.`);
                    wlanId = String(ssid.wlanId);
                }
                const write = async (): Promise<unknown> =>
                    wlanId === undefined
                        ? await client.setSsidSection(ssidId, configType as Exclude<typeof configType, 'rate-control'>, body, siteId, customHeaders)
                        : await client.setSsidRateControl(wlanId, ssidId, body as Parameters<Client['setSsidRateControl']>[2], siteId, customHeaders);
                return await runSettings({
                    label: `SSID ${configType}`,
                    read,
                    payload: changes,
                    dryRun,
                    write,
                    ...(configType === 'hotspotv2' ? { writeOnly: Object.keys(changes) } : {}),
                    warnings: [
                        changes.ssidEnable === false
                            ? 'Disabling the SSID disconnects all of its clients.'
                            : 'SSID changes are pushed to the APs and can briefly disconnect wireless clients.',
                    ],
                });
            }
        )
    );
}
