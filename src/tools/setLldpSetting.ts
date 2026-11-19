import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteApLldpSettingVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';
import { runMergedSettings } from './settingsShared.js';

const inputSchema = siteInputSchema.extend({
    enable: z.boolean().describe('Turn LLDP on or off for the site devices.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getLldpSetting' | 'setLldpSetting'>;

export function registerSetLldpSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setLldpSetting',
        {
            description:
                'Turn LLDP (neighbour discovery) on or off for the site devices. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setLldpSetting',
            mutationSummary('setLldpSetting', () => 'site'),
            async ({ enable, siteId, customHeaders, dryRun }) =>
                await runMergedSettings({
                    label: 'LLDP',
                    schema: siteApLldpSettingVOSchema,
                    read: async () => ((await client.getLldpSetting(siteId, customHeaders)) as { lldp?: unknown } | undefined)?.lldp,
                    changes: { enable },
                    dryRun,
                    write: (lldp) => client.setLldpSetting({ lldp }, siteId, customHeaders),
                })
        )
    );
}
