import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { switchGeneralSettingsSchema } from '../omadaClient/switches.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
    payload: switchGeneralSettingsSchema.describe(
        'Switch general settings (official SwitchGeneralConfig without sdm): name, ledSetting (0 off, 1 on, 2 site setting), tagIds (device tag IDs, not port labels), location, jumbo and LAG hash settings, SNMP location/contact. Send only the fields to change.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSwitchGeneralConfig' | 'setSwitchGeneralConfig'>;

export function registerSetSwitchGeneralConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSwitchGeneralConfig',
        {
            description:
                'Change a switch name, LED, labels, location, jumbo frame or LAG hash settings. The SDM template is not offered because changing it reboots the switch. Defaults to a preview of the current settings and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSwitchGeneralConfig',
            mutationSummary('set-switch-general-config', (args) => String(args.switchMac)),
            async ({ switchMac, payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'switch general config',
                    read: () => client.getSwitchGeneralConfig(switchMac, siteId, customHeaders),
                    payload,
                    dryRun,
                    // The controller answers with the whole device record; keep the result to the acknowledgement.
                    write: async () => {
                        await client.setSwitchGeneralConfig(switchMac, payload, siteId, customHeaders);
                        return {};
                    },
                    warnings:
                        payload.jumbo !== undefined || payload.jumboFollowSite !== undefined
                            ? ['Changing the jumbo frame size can briefly interrupt switch ports.']
                            : [],
                })
        )
    );
}
