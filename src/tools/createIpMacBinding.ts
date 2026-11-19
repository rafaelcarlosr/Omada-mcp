import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { ipMacBindingPayloadSchema } from '../omadaClient/siteServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: ipMacBindingPayloadSchema.describe(
        'IP-MAC binding (official IPMacBinding): ip, mac, status, interfaceType (0 WAN, 1 LAN) with interfaceId (WAN port ID or LAN network ID), optional description and enableExportToDhcpReservation (the controller enables it when omitted).'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createIpMacBinding' | 'getGridIpMacBinding'>;

export function registerCreateIpMacBindingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createIpMacBinding',
        {
            description:
                'Create a gateway IP-MAC binding (ARP binding) on a LAN network or WAN port, optionally exported as a DHCP reservation. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createIpMacBinding',
            mutationSummary('create-ip-mac-binding', (args) => String((args.payload as { mac?: unknown }).mac)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'IP-MAC binding',
                        list: () => client.getGridIpMacBinding(1, 1000, siteId, customHeaders),
                        nameKey: null,
                    },
                    payload,
                    dryRun,
                    write: () => client.createIpMacBinding(payload, siteId, customHeaders),
                    warnings: ['With IP-MAC binding enforcement on, a device using this IP with another MAC loses access.'],
                })
        )
    );
}
