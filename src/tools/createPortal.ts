import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { portalSettingSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { PORTAL_WRITE_ONLY, withCustomizeDefaults } from './portalShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runCreate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: portalSettingSchema.describe(
        'Portal (official PortalSetting): name, enable, ssidList and/or networkList, authType (0 none, 1 simple password, 2 external RADIUS, ... 11 hotspot), authTimeout, httpsRedirectEnable, landingPage and the settings of the chosen authentication. portalCustomize defaults to the controller page with its required switches off.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createPortal' | 'getPortal' | 'getPortalProfile'>;

export function registerCreatePortalTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createPortal',
        {
            description:
                'Create a captive portal for SSIDs or LAN networks. Clients on them must pass the portal before getting access. Secrets are redacted in every response. Defaults to a preview; set dryRun:false to create once and verify the main fields by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createPortal',
            mutationSummary('create-portal', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                const body = portalSettingSchema.parse({ ...payload, portalCustomize: withCustomizeDefaults(payload.portalCustomize) });
                return await runCreate({
                    spec: {
                        label: 'portal',
                        list: async () => toRecords(await client.getPortalProfile(siteId, customHeaders)),
                        detail: (id) => client.getPortal(id, siteId, customHeaders),
                        // While disabled the controller keeps only the name and switch, so only those are verified.
                        writeOnly: body.enable ? PORTAL_WRITE_ONLY : Object.keys(body).filter((key) => key !== 'name' && key !== 'enable'),
                    },
                    payload: body as RecordLike,
                    dryRun,
                    write: () => client.createPortal(body, siteId, customHeaders),
                    warnings: [
                        body.enable
                            ? 'Clients on the listed SSIDs and networks must pass the portal before getting access.'
                            : 'A disabled portal is stored with the controller defaults; its other settings are dropped until it is enabled with them.',
                    ],
                });
            }
        )
    );
}
