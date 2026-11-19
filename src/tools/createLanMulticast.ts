import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { lanMulticastPayloadSchema } from '../omadaClient/lanServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: lanMulticastPayloadSchema.describe(
        'Multicast snooping (official LanMulticastVO): name, networks [{ networkId, vlanType, vlan }], protocol (0 IGMP, 1 MLD), unknownMulticastRule (0 forward, 1 discard, 2 router port first), floodKnownEnable, querierEnable, routerPortEnable and optional queriers and snooping timers.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createLanMulticast' | 'listLanMulticasts'>;

export function registerCreateLanMulticastTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createLanMulticast',
        {
            description:
                'Create an IGMP or MLD snooping configuration for LAN networks; switches then forward multicast only to subscribed ports. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createLanMulticast',
            mutationSummary('create-lan-multicast', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: { label: 'LAN multicast', list: () => client.listLanMulticasts(siteId, customHeaders) },
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.createLanMulticast(payload, siteId, customHeaders),
                })
        )
    );
}
