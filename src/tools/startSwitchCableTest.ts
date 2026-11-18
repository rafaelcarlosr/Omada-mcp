import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { switchPortListSchema } from '../omadaClient/switchPorts.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runAction, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
    ports: switchPortListSchema.describe('Explicit, unique port IDs to test; 1 to 32 targets.'),
    allowDisruption: z
        .boolean()
        .default(false)
        .describe('Also test the uplink port or ports with connected devices. Testing drops the link on those ports while it runs.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSitesCableTestSwitchesPorts' | 'startSwitchCableTest'>;

function connected(port: RecordLike): boolean {
    return port.isUpperPort === true || (Array.isArray(port.downlinkDevices) && port.downlinkDevices.length > 0);
}

export function registerStartSwitchCableTestTool(server: McpServer, client: Client): void {
    server.registerTool(
        'startSwitchCableTest',
        {
            description:
                'Start a cable diagnostic on switch ports; read the outcome with getCableTestFullResults. The link on a tested port drops while the test runs, so the uplink and ports with connected devices are refused unless allowDisruption is true. Defaults to a preview; set dryRun:false to send.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'startSwitchCableTest',
            mutationSummary('start-switch-cable-test', (args) => `${String(args.switchMac)} ports ${String(args.ports)}`),
            async ({ switchMac, ports, allowDisruption, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'cable test',
                    dryRun,
                    preflight: async () => {
                        const known = new Map(
                            toRecords(await client.listSitesCableTestSwitchesPorts(switchMac, siteId, customHeaders)).map((port) => [port.port, port])
                        );
                        const missing = ports.filter((port) => !known.has(port));
                        if (missing.length)
                            throw new Error(`Ports ${missing.join(', ')} cannot be cable-tested on this switch. No request was sent.`);
                        const busy = ports.filter((port) => connected(known.get(port) as RecordLike));
                        if (busy.length && !allowDisruption) {
                            throw new Error(
                                `Ports ${busy.join(', ')} are the uplink or have connected devices; testing drops their link. Set allowDisruption:true to test them. No request was sent.`
                            );
                        }
                        return {
                            switchMac,
                            ports: ports.map((port) => {
                                const row = known.get(port) as RecordLike;
                                return { port, name: row.name, uplink: row.isUpperPort === true, connectedDevices: row.downlinkDevices ?? [] };
                            }),
                        };
                    },
                    write: () => client.startSwitchCableTest(switchMac, ports, siteId, customHeaders),
                    warnings: ['The link on each tested port drops while the test runs.'],
                })
        )
    );
}
