import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { apSsidOverrideOpenApiV2VO03Schema } from '../omadaClient/requestSchemas.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
    payload: apSsidOverrideOpenApiV2VO03Schema.describe(
        'Per-AP SSID overrides (official ApSsidOverrideOpenApiV2VO): one entry per ssidEntryId from getApSsidOverrides, with ssidEnable to turn the SSID off on this AP only, and optional name, password and VLAN overrides. Override passwords are write-only.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getApSsidOverrides' | 'getSsidList' | 'setApSsidOverrides'>;
type Entry = z.infer<typeof apSsidOverrideOpenApiV2VO03Schema>['ssidOverrides'][number];

/** Readback entries keyed by ssidEntryId; the controller reports effective values, not the override flags. */
function byEntryId(value: unknown): RecordLike {
    const overrides = (value as { ssidOverrides?: unknown } | undefined)?.ssidOverrides;
    return Object.fromEntries(toRecords(overrides ?? []).map((entry) => [String(entry.ssidEntryId), entry]));
}

/**
 * The effective fields a request should produce on 6.3: enable state, name and VLAN. Turning an override off
 * must bring back the SSID's own name and VLAN, taken from the WLAN group's SSID list.
 */
function expected(entry: Entry, current: RecordLike | undefined, ssids: Map<unknown, RecordLike>): RecordLike {
    const ssid = ssids.get(current?.ssidId);
    const out: RecordLike = {};
    if (entry.ssidEnable !== undefined) out.ssidEnable = entry.ssidEnable;
    if (entry.overrideSsidEnable && entry.overrideSsidName !== undefined) out.ssidName = entry.overrideSsidName;
    if (!entry.overrideSsidEnable && typeof ssid?.name === 'string') out.ssidName = ssid.name;
    if (entry.overrideVlanEnable && entry.vlanId !== undefined) Object.assign(out, { vlanEnable: true, vlanId: entry.vlanId });
    if (!entry.overrideVlanEnable && typeof ssid?.vlanEnable === 'boolean') {
        out.vlanEnable = ssid.vlanEnable;
        if (ssid.vlanEnable && typeof ssid.vlanId === 'number') out.vlanId = ssid.vlanId;
    }
    return out;
}

export function registerSetApSsidOverridesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setApSsidOverrides',
        {
            description:
                'Override SSIDs on one access point only: disable an SSID there, or change its name, password or VLAN for that AP. Wireless clients of the affected SSIDs on this AP can be disconnected. Defaults to a preview of the current overrides and differences; set dryRun:false to apply once and verify the effective SSID state by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setApSsidOverrides',
            mutationSummary('set-ap-ssid-overrides', (args) => String(args.apMac)),
            async ({ apMac, payload, siteId, customHeaders, dryRun }) => {
                const current = await client.getApSsidOverrides(apMac, siteId, customHeaders);
                const known = byEntryId(current);
                const unknown = payload.ssidOverrides.filter((entry) => !(String(entry.ssidEntryId) in known)).map((entry) => entry.ssidEntryId);
                if (unknown.length) {
                    throw new Error(`SSID entries ${unknown.join(', ')} are not on this AP; read getApSsidOverrides again. No request was sent.`);
                }
                // apGroupId is the AP's WLAN group: its SSID list holds the values an override replaces.
                const wlanId = (current as { apGroupId?: unknown } | undefined)?.apGroupId;
                const ssids = new Map(
                    typeof wlanId === 'string'
                        ? toRecords(await client.getSsidList(wlanId, siteId, customHeaders)).map((ssid) => [ssid.ssidId ?? ssid.id, ssid])
                        : []
                );
                const comparable = {
                    entries: Object.fromEntries(
                        payload.ssidOverrides.map((entry) => [
                            String(entry.ssidEntryId),
                            expected(entry, known[String(entry.ssidEntryId)] as RecordLike, ssids),
                        ])
                    ),
                };
                return await runSettings({
                    label: 'AP SSID overrides',
                    read: async () => ({ entries: byEntryId(await client.getApSsidOverrides(apMac, siteId, customHeaders)) }),
                    payload: comparable,
                    dryRun,
                    write: () => client.setApSsidOverrides(apMac, payload, siteId, customHeaders),
                    warnings: [
                        'Wireless clients of the affected SSIDs on this AP can be disconnected.',
                        ...(payload.ssidOverrides.some((entry) => entry.overrideSsidPassword !== undefined)
                            ? ['Override passwords are write-only and are not verified by readback.']
                            : []),
                    ],
                });
            }
        )
    );
}
