import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { createAclVerified, createSwitchAclInputSchema, switchAclPayloadSchema } from './gatewayAclShared.js';

export function registerCreateSwitchAclTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'createSwitchAcl',
        {
            description: 'Create a switch (OSW) ACL rule for layer-2 access policy control using the official Omada Open API.',
            inputSchema: createSwitchAclInputSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapMutationToolHandler(
            'createSwitchAcl',
            ({ siteId }, result, mode) => ({
                action: 'create-switch-acl',
                target: siteId ?? 'default-site',
                siteId,
                mode,
                status: mode === 'dry-run' ? 'planned' : 'applied',
                summary: mode === 'dry-run' ? 'Planned switch ACL creation.' : 'Switch ACL creation requested.',
                result,
            }),
            async ({ payload, dryRun, siteId, customHeaders }) => {
                const parsedPayload = switchAclPayloadSchema.parse(payload);
                const existingAcls = await client.listOswAcls(siteId, customHeaders);

                if (dryRun) {
                    return {
                        accepted: true,
                        dryRun: true,
                        plannedAcl: parsedPayload,
                    };
                }

                return await createAclVerified({
                    label: 'switch ACL',
                    list: () => client.listOswAcls(siteId, customHeaders),
                    before: existingAcls,
                    payload: parsedPayload,
                    write: () => client.createOswAcl(parsedPayload, siteId, customHeaders),
                });
            }
        )
    );
}
