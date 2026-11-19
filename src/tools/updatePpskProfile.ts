import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { ppskProfileSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { pickBySchema } from './authProfileShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('PPSK profile ID from getPPSKProfiles.'),
    changes: ppskProfileSchema
        .omit({ type: true })
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe(
            'Fields to change; the others, the PSK list included, keep their current values. ppsk replaces the whole list; use addPpskEntries and deletePpskEntries for single entries.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getPPSKProfiles' | 'getPpskUserGroup' | 'updatePpskProfile'>;

export function registerUpdatePpskProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updatePpskProfile',
        {
            description:
                'Change a PPSK profile. Only the listed fields change; the controller needs the complete profile, so the rest, existing PSKs included, comes from the current profile. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updatePpskProfile',
            mutationSummary('update-ppsk-profile', (args) => String(args.profileId)),
            async ({ profileId, changes, siteId, customHeaders, dryRun }) => {
                const spec = {
                    label: 'PPSK profile',
                    list: async () => toRecords(await client.getPPSKProfiles(0, siteId, customHeaders)),
                    nameKey: 'profileName',
                    detail: (id: string) => client.getPpskUserGroup(id, siteId, customHeaders),
                };
                if (!findRecord(toRecords(await spec.list()), profileId))
                    throw new Error(`No PPSK profile with id "${profileId}" exists. List them again to get a current id.`);
                const current = pickBySchema(
                    ppskProfileSchema.omit({ type: true }),
                    await client.getPpskUserGroup(profileId, siteId, customHeaders)
                ) as RecordLike;
                const payload = ppskProfileSchema.parse({ ...current, ...changes });
                return await runUpdate({
                    spec,
                    id: profileId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updatePpskProfile(profileId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
