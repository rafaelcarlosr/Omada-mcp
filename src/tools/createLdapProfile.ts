import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createLdapProfileOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: createLdapProfileOpenApiVOSchema.describe(
        'LDAP profile (official CreateLdapProfileOpenApiVO): name, status, bindType (0 simple, 1 anonymous, 2 regular), server, dstPort, useSsl, cn, baseDn, optional groupDn/filter, regularDn and regularPassword for regular bind.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createLdapProfile' | 'getLdapProfileList'>;

export function registerCreateLdapProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createLdapProfile',
        {
            description:
                'Create an LDAP profile for portal or 802.1X authentication. The bind password is redacted in every response. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createLdapProfile',
            mutationSummary('create-ldap-profile', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'LDAP profile',
                        list: async () => toRecords(await client.getLdapProfileList(siteId, customHeaders)),
                        idKeys: ['ldapProfileId'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createLdapProfile(payload, siteId, customHeaders),
                })
        )
    );
}
