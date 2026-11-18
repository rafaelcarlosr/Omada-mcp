import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { updateEoGreTunnelSettingOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: updateEoGreTunnelSettingOpenApiVOSchema
        .extend({ tunnelMtu: z.number().int().min(850).max(1500).describe('Tunnel MTU, 850-1500.') })
        .describe(
            'EoGRE tunnel settings (official UpdateEoGreTunnelSettingOpenApiVO): greEnable and tunnelMtu are required; interval, maxCount and the gateway addresses are optional. Fields left out are cleared.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getEoGreTunnelConfig' | 'setEoGreTunnelConfig'>;

export function registerSetEoGreTunnelConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setEoGreTunnelConfig',
        {
            description:
                'Enable, disable or change the site EoGRE tunnel (MTU, keepalive, primary and secondary gateway). The controller replaces the whole setting, so fields left out are cleared. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setEoGreTunnelConfig',
            mutationSummary('set-eogre-tunnel-config', (args) => String(args.siteId ?? 'default-site')),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'EoGRE tunnel',
                    read: () => client.getEoGreTunnelConfig(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setEoGreTunnelConfig(payload, siteId, customHeaders),
                    warnings: ['Traffic carried by the EoGRE tunnel is interrupted while the tunnel is reconfigured.'],
                })
        )
    );
}
