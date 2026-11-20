import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { deleteAclInputSchema, findAclById } from './gatewayAclShared.js';
import { applyAndVerify, type RecordLike } from './resourceMutationShared.js';

export function registerDeleteAclTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'deleteAcl',
        {
            description:
                'Delete an existing gateway, EAP or switch ACL rule by ID. Use listOsgAcls, listEapAcls or getOswAclList first to identify the rule.',
            inputSchema: deleteAclInputSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapMutationToolHandler(
            'deleteAcl',
            ({ aclId, siteId }, result, mode) => ({
                action: 'delete-acl',
                target: aclId,
                siteId,
                mode,
                status: mode === 'dry-run' ? 'planned' : 'applied',
                summary: mode === 'dry-run' ? `Planned ACL deletion for ${aclId}.` : `ACL deletion requested for ${aclId}.`,
                result,
            }),
            async ({ aclId, dryRun, siteId, customHeaders }) => {
                const lists: Array<{ label: string; list: () => Promise<unknown> }> = [
                    { label: 'EAP ACL', list: () => client.listEapAcls(siteId, customHeaders) },
                    { label: 'gateway ACL', list: () => client.listOsgAcls(siteId, customHeaders) },
                    { label: 'switch ACL', list: () => client.listOswAcls(siteId, customHeaders) },
                ];
                const aclLookupErrors: Error[] = [];
                let found: { label: string; list: () => Promise<unknown>; existing: unknown } | undefined;

                for (const kind of lists) {
                    try {
                        const existing = findAclById(await kind.list(), aclId);
                        if (existing) {
                            found = { ...kind, existing };
                            break;
                        }
                    } catch (error) {
                        aclLookupErrors.push(error instanceof Error ? error : new Error(String(error)));
                    }
                }

                if (!found) {
                    if (aclLookupErrors.length > 0) {
                        throw aclLookupErrors[0];
                    }
                    throw new Error(`No ACL exists for ${aclId}.`);
                }

                if (dryRun) {
                    return {
                        accepted: true,
                        dryRun: true,
                        aclType: found.label,
                        before: found.existing,
                    };
                }

                const { list, label } = found;
                const result = await applyAndVerify({
                    label,
                    action: 'deletion',
                    write: () => client.deleteAcl(aclId, siteId, customHeaders),
                    read: async () => findAclById(await list(), aclId) as RecordLike | undefined,
                    requested: undefined,
                });
                return { id: aclId, aclType: label, ...result };
            }
        )
    );
}
