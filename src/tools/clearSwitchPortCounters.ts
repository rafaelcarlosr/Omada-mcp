import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { switchPortListSchema } from '../omadaClient/switchPorts.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch.'),
    ports: switchPortListSchema.describe('Explicit, unique port IDs whose counters to reset; 1 to 32 targets.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'clearSwitchPortCounters' | 'getSwitchDetail'>;

export function registerClearSwitchPortCountersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'clearSwitchPortCounters',
        {
            description:
                'Reset the traffic and error counters of switch ports. Traffic is not affected, but the previous counter values are lost. Defaults to a preview; set dryRun:false to send.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'clearSwitchPortCounters',
            mutationSummary('clear-switch-port-counters', (args) => `${String(args.switchMac)} ports ${String(args.ports)}`),
            async ({ switchMac, ports, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'counter reset',
                    dryRun,
                    preflight: async () => {
                        const detail = (await client.getSwitchDetail(switchMac, siteId, customHeaders)) as { portList?: unknown };
                        const known = new Set(toRecords(detail?.portList ?? []).map((port) => port.port));
                        const missing = ports.filter((port) => !known.has(port));
                        if (missing.length) throw new Error(`Ports ${missing.join(', ')} do not exist on this switch. No request was sent.`);
                        return { switchMac, ports };
                    },
                    write: () => client.clearSwitchPortCounters({ portList: ports.map((port) => ({ port, switchMac })) }, siteId, customHeaders),
                    warnings: ['Previous counter values for these ports are lost.'],
                })
        )
    );
}
