import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ldapProfileId: z.string().trim().min(1).describe('LDAP profile ID (ldapProfileId) from getLdapProfileList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteLdapProfile' | 'getLdapProfileList'>;

export function registerDeleteLdapProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteLdapProfile',
        {
            description:
                'Delete an LDAP profile; the controller refuses profiles still in use. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteLdapProfile',
            mutationSummary('delete-ldap-profile', (args) => String(args.ldapProfileId)),
            async ({ ldapProfileId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'LDAP profile',
                        list: async () => toRecords(await client.getLdapProfileList(siteId, customHeaders)),
                        idKeys: ['ldapProfileId'],
                    },
                    id: ldapProfileId,
                    dryRun,
                    write: () => client.deleteLdapProfile(ldapProfileId, siteId, customHeaders),
                })
        )
    );
}
