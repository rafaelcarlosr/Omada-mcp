import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { apnProfileConfigSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: apnProfileConfigSchema.describe(
        'APN profile (official ApnProfileConfig): name, pdpType (0 IPv4, 1 IPv6, 2 both), apnType (0 static with apn, 1 dynamic), authentication (0 none, 1 PAP, 2 CHAP) with username and password, and applyToSIM for dual-SIM gateways.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createApnProfile' | 'listApnProfiles'>;

export function registerCreateApnProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createApnProfile',
        {
            description:
                'Create an APN profile for LTE/5G gateways: static or dynamic APN, PDP type and PAP/CHAP credentials. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createApnProfile',
            mutationSummary('create-apn-profile', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'APN profile',
                        list: () => client.listApnProfiles(siteId, customHeaders),
                    },
                    payload,
                    dryRun,
                    write: () => client.createApnProfile(payload, siteId, customHeaders),
                })
        )
    );
}
