import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { createAclVerified, createEapAclInputSchema, eapAclPayloadSchema, validateEapAclPayloadReferences } from './gatewayAclShared.js';

export function registerCreateEapAclTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'createEapAcl',
        {
            description: 'Create an EAP ACL rule for wireless access policy control using the official Omada Open API.',
            inputSchema: createEapAclInputSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapMutationToolHandler(
            'createEapAcl',
            ({ siteId }, result, mode) => ({
                action: 'create-eap-acl',
                target: siteId ?? 'default-site',
                siteId,
                mode,
                status: mode === 'dry-run' ? 'planned' : 'applied',
                summary: mode === 'dry-run' ? 'Planned EAP ACL creation.' : 'EAP ACL creation requested.',
                result,
            }),
            async ({ payload, dryRun, siteId, customHeaders }) => {
                const parsedPayload = eapAclPayloadSchema.parse(payload);
                const existingAcls = await client.listEapAcls(siteId, customHeaders);
                await validateEapAclPayloadReferences(client, parsedPayload, siteId, customHeaders);

                if (dryRun) {
                    return {
                        accepted: true,
                        dryRun: true,
                        plannedAcl: parsedPayload,
                    };
                }

                return await createAclVerified({
                    label: 'EAP ACL',
                    list: () => client.listEapAcls(siteId, customHeaders),
                    before: existingAcls,
                    payload: parsedPayload,
                    write: () => client.createEapAcl(parsedPayload, siteId, customHeaders),
                });
            }
        )
    );
}
