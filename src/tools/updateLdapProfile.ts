import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { createLdapProfileOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { pickBySchema } from './authProfileShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ldapProfileId: z.string().trim().min(1).describe('LDAP profile ID (ldapProfileId) from getLdapProfileList.'),
    changes: createLdapProfileOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change; the others, the bind password included, keep their current values.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getLdapProfileList' | 'updateLdapProfile'>;

export function registerUpdateLdapProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateLdapProfile',
        {
            description:
                'Change an LDAP profile. Only the listed fields change; the controller needs the complete profile, so the rest, the bind password included, is taken from the current profile. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateLdapProfile',
            mutationSummary('update-ldap-profile', (args) => String(args.ldapProfileId)),
            async ({ ldapProfileId, changes, siteId, customHeaders, dryRun }) => {
                const current = findRecord(toRecords(await client.getLdapProfileList(siteId, customHeaders)), ldapProfileId, ['ldapProfileId']);
                if (!current) throw new Error(`No LDAP profile with id "${ldapProfileId}" exists. List them again to get a current id.`);
                const payload = createLdapProfileOpenApiVOSchema.parse(pickBySchema(createLdapProfileOpenApiVOSchema, { ...current, ...changes }));
                return await runUpdate({
                    spec: {
                        label: 'LDAP profile',
                        list: async () => toRecords(await client.getLdapProfileList(siteId, customHeaders)),
                        idKeys: ['ldapProfileId'],
                    },
                    id: ldapProfileId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateLdapProfile(ldapProfileId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
