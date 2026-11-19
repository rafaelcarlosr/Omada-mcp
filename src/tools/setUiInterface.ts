import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { uiInterfacePayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, pick, type RecordLike, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: uiInterfacePayloadSchema.describe(
        "UI settings to change (official UI Interface): timeZone shown in the UI (0 site's, 1 browser's, 2 controller's, 3 UTC) and refreshRate (0 15 s, 1 1 min, 2 2 min, 3 5 min, 4 never)."
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getUiInterface' | 'setUiInterface'>;

/** Fields the controller resets to their defaults when a PATCH leaves them out. */
const KEPT = ['timeZone', 'refreshRate', 'privateLabelingEnable'];

export function registerSetUiInterfaceTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setUiInterface',
        {
            description:
                'Change the controller UI time zone display and auto-refresh rate. The controller resets fields left out of an update, so the change is sent together with the current values. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setUiInterface',
            mutationSummary('set-ui-interface', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) => {
                const read = (): Promise<unknown> => client.getUiInterface(customHeaders);
                return await runSettings({
                    label: 'UI interface',
                    read,
                    payload,
                    dryRun,
                    write: async () => {
                        const current = pick((await read()) as RecordLike, KEPT);
                        return await client.setUiInterface({ refreshRate: 2, ...current, ...payload } as { refreshRate: number }, customHeaders);
                    },
                });
            }
        )
    );
}
