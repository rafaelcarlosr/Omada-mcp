import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { portalSettingSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { PORTAL_WRITE_ONLY, portalRequest, withCustomizeDefaults } from './portalShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    portalId: z.string().trim().min(1).describe('Portal ID from getPortalProfile.'),
    changes: portalSettingSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe(
            'Fields to change; the others, page customization included, keep their current values. portalCustomize replaces the whole customization.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getPortal' | 'getPortalCustomization' | 'getPortalProfile' | 'updatePortal'>;

export function registerUpdatePortalTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updatePortal',
        {
            description:
                'Change a captive portal. Only the listed fields change; the controller needs the complete portal, so the rest comes from the current portal and its page customization. Defaults to a preview; set dryRun:false to apply once and verify the main fields by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updatePortal',
            mutationSummary('update-portal', (args) => String(args.portalId)),
            async ({ portalId, changes, siteId, customHeaders, dryRun }) => {
                if (!findRecord(toRecords(await client.getPortalProfile(siteId, customHeaders)), portalId)) {
                    throw new Error(`No portal with id "${portalId}" exists. List them again to get a current id.`);
                }
                const current = portalRequest(
                    await client.getPortal(portalId, siteId, customHeaders),
                    await client.getPortalCustomization(portalId, siteId, customHeaders)
                );
                const ignored = Object.keys(changes).filter((key) => key !== 'name' && key !== 'enable');
                if ((changes.enable ?? current.enable) !== true && ignored.length) {
                    throw new Error(
                        `The controller keeps ${ignored.join(', ')} only while the portal is enabled; set enable:true in the same change. No request was sent.`
                    );
                }
                const body = portalSettingSchema.parse({
                    ...current,
                    ...changes,
                    portalCustomize: changes.portalCustomize ? withCustomizeDefaults(changes.portalCustomize) : current.portalCustomize,
                });
                return await runUpdate({
                    spec: {
                        label: 'portal',
                        list: async () => toRecords(await client.getPortalProfile(siteId, customHeaders)),
                        detail: (id) => client.getPortal(id, siteId, customHeaders),
                        // A disabled portal keeps only its name and switch.
                        writeOnly: body.enable ? PORTAL_WRITE_ONLY : Object.keys(body).filter((key) => key !== 'name' && key !== 'enable'),
                    },
                    id: portalId,
                    payload: body as RecordLike,
                    dryRun,
                    write: () => client.updatePortal(portalId, body, siteId, customHeaders),
                });
            }
        )
    );
}
