import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { mailServerPayloadSchema } from '../omadaClient/siteServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

/** Without authentication the controller drops username and authCode, so they are refused instead. */
const payloadSchema = mailServerPayloadSchema.superRefine((value, ctx) => {
    if (value.auth) return;
    for (const key of ['username', 'authCode'] as const) {
        if (value[key] !== undefined) ctx.addIssue({ code: 'custom', path: [key], message: `${key} applies only when auth is true.` });
    }
});

const inputSchema = siteInputSchema.extend({
    payload: payloadSchema.describe(
        'Mail server (official MailServerOpenApiVO): sender, receiver, ssl, smtpServer, smtpPort, auth and, with auth, username and authCode (the mailbox authorization code).'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSiteMailServer' | 'getSiteMailServer' | 'updateSiteMailServer'>;

export function registerSetSiteMailServerTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSiteMailServer',
        {
            description:
                'Set the site mail server used for alert emails (sender, receiver, SMTP server, port, SSL, authentication). Creates it when the site has none; the Open API has no route to remove it afterwards. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSiteMailServer',
            mutationSummary('set-site-mail-server', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<unknown> => (await client.getSiteMailServer(siteId, customHeaders)) ?? {};
                const current = (await read()) as { id?: unknown };
                const id = typeof current.id === 'string' ? current.id : undefined;
                return await runSettings({
                    label: 'mail server',
                    read,
                    payload,
                    dryRun,
                    write: () =>
                        id
                            ? client.updateSiteMailServer(id, payload, siteId, customHeaders)
                            : client.createSiteMailServer(payload, siteId, customHeaders),
                    warnings: id ? [] : ['The site has no mail server yet; this creates one, and the Open API cannot remove it later.'],
                });
            }
        )
    );
}
