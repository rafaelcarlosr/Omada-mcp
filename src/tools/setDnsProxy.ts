import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { dnsProxySettingOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { DNS_PROXY_SETTING } from './lanShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    changes: dnsProxySettingOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe(
            'Fields to change: enable, type (0 DNSSEC, 1 DoH, 2 DoT, 3 DNS override) and the setting of that type: dnsSecSetting { servers, replyPolicy }, dohSetting, dotSetting or dnsOverrideSetting { primaryDnsServer }.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getDnsProxy' | 'setDnsProxy'>;

export function registerSetDnsProxyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setDnsProxy',
        {
            description:
                'Change the gateway DNS proxy: DNSSEC validation, DNS over HTTPS/TLS or DNS override. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setDnsProxy',
            mutationSummary('set-dns-proxy', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => ((await client.getDnsProxy(siteId, customHeaders)) ?? {}) as RecordLike;
                const merged: RecordLike = { ...(await read()), ...changes };
                let body: RecordLike = { enable: false };
                if (merged.enable === true) {
                    const setting = DNS_PROXY_SETTING[Number(merged.type)];
                    if (!setting)
                        throw new Error('Enabling the DNS proxy needs type 0 (DNSSEC), 1 (DoH), 2 (DoT) or 3 (DNS override). No request was sent.');
                    if (merged[setting] === undefined) throw new Error(`type ${String(merged.type)} needs ${setting}. No request was sent.`);
                    body = { enable: true, type: merged.type, [setting]: merged[setting] };
                }
                const payload = dnsProxySettingOpenApiVOSchema.parse(body);
                return await runSettings({
                    label: 'DNS proxy',
                    read,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.setDnsProxy(payload, siteId, customHeaders),
                });
            }
        )
    );
}
