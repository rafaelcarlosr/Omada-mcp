import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteMulticastRateLimitSettingSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: siteMulticastRateLimitSettingSchema.describe(
        'Multicast rate limit (official SiteMulticastRateLimitSetting): mcastRateLimit with enable and per-protocol *Enable / *Pps fields.'
    ),
    dryRun: dryRunSchema,
});

/** The controller keeps a packets-per-second value only while that protocol's limit is enabled, and drops it otherwise. */
function refuseIgnoredRates(requested: RecordLike, current: RecordLike): void {
    const ignored = Object.keys(requested)
        .filter((key) => key.endsWith('Pps'))
        .filter((key) => {
            const flag = `${key.slice(0, -3)}Enable`;
            return (requested[flag] ?? current[flag]) !== true;
        });
    if (ignored.length) {
        throw new Error(
            `${ignored.join(', ')}: the controller keeps a rate only while its *Enable flag is true; enable it in the same request. No request was sent.`
        );
    }
}

type Client = Pick<OmadaClient, 'getMulticastRateLimit' | 'setMulticastRateLimit'>;

export function registerSetMulticastRateLimitTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setMulticastRateLimit',
        {
            description:
                'Change the site multicast and broadcast rate limits (ARP, ND, IGMP, DHCP, DHCPv6, mDNS and other broadcast or multicast packets per second). Only the fields sent are changed. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setMulticastRateLimit',
            mutationSummary('set-multicast-rate-limit', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                const read = (): Promise<unknown> => client.getMulticastRateLimit(siteId, customHeaders);
                refuseIgnoredRates(
                    payload.mcastRateLimit ?? {},
                    ((await read()) as { mcastRateLimit?: RecordLike } | undefined)?.mcastRateLimit ?? {}
                );
                return await runSettings({
                    label: 'multicast rate limit',
                    read,
                    payload,
                    dryRun,
                    write: () => client.setMulticastRateLimit(payload, siteId, customHeaders),
                    warnings: ['Limits that are too low drop ARP, DHCP or mDNS traffic and can break address assignment and discovery.'],
                });
            }
        )
    );
}
