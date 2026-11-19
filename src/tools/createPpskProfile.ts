import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { ppskProfileV2Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runCreate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: ppskProfileV2Schema.describe(
        'PPSK profile (official PpskProfile V2): profileName and either autoCreatePsks false with ppsk [{ name, psk, mac?, vlan? }], or autoCreatePsks true with number, prefix, length and optionally vlan or vlanPool with vlanInterval; optional rateLimit and expiration.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createPpskProfile' | 'getPPSKProfiles' | 'getPpskUserGroup'>;

export function registerCreatePpskProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createPpskProfile',
        {
            description:
                'Create a private-PSK profile: each client device or user gets its own Wi-Fi password, optionally bound to a VLAN. PSKs are redacted in every response. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createPpskProfile',
            mutationSummary('create-ppsk-profile', (args) => String((args.payload as { profileName?: unknown }).profileName)),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                if (!payload.autoCreatePsks && !payload.ppsk?.length) {
                    throw new Error('Without autoCreatePsks the profile needs ppsk entries. No request was sent.');
                }
                if (payload.autoCreatePsks && payload.vlan !== undefined && payload.vlanPool !== undefined) {
                    // The spec marks both as required, but 6.3 rejects them together (-1001); either binds the generated PSKs.
                    throw new Error('Use vlan or vlanPool (with vlanInterval) for generated PSKs, not both. No request was sent.');
                }
                return await runCreate({
                    spec: {
                        label: 'PPSK profile',
                        list: async () => toRecords(await client.getPPSKProfiles(0, siteId, customHeaders)),
                        nameKey: 'profileName',
                        detail: (id) => client.getPpskUserGroup(id, siteId, customHeaders),
                        writeOnly: [
                            'autoCreatePsks',
                            'number',
                            'prefix',
                            'length',
                            'vlan',
                            'vlanPool',
                            'vlanInterval',
                            ...(payload.autoCreatePsks ? ['ppsk'] : []),
                        ],
                    },
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.createPpskProfile(payload, siteId, customHeaders),
                });
            }
        )
    );
}
