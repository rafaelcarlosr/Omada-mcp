import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import * as schemas from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';
import { runMergedSettings } from './settingsShared.js';

const inputSchema = siteInputSchema.extend({
    changes: schemas.sessionLimitEntitySchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: enable.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSessionLimit' | 'setSessionLimit'>;

export function registerSetSessionLimitTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSessionLimit',
        {
            description:
                'Turn gateway session limiting on or off for the site. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSessionLimit',
            mutationSummary('setSessionLimit', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) =>
                await runMergedSettings({
                    label: 'session limit',
                    schema: schemas.sessionLimitEntitySchema,
                    read: () => client.getSessionLimit(siteId, customHeaders),
                    changes,
                    dryRun,
                    write: (payload) => client.setSessionLimit(payload, siteId, customHeaders),
                })
        )
    );
}
