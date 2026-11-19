import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { sendMailServerOpenApiVO21Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: sendMailServerOpenApiVO21Schema.describe(
        'SMTP server to test (official SendMailServerOpenApiVO): smtpServer, port, sslEnable, authEnable with username and password, senderAddress and receiver.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'sendTestMail'>;

export function registerSendTestMailTool(server: McpServer, client: Client): void {
    server.registerTool(
        'sendTestMail',
        {
            description:
                'Have the controller send a test email through an SMTP server, to check mail settings before saving them. Defaults to a preview; set dryRun:false to send. A controller error such as -30003 means the mail could not be delivered.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'sendTestMail',
            mutationSummary('send-test-mail', (args) => String((args.payload as { receiver?: unknown }).receiver)),
            async ({ payload, customHeaders, dryRun }) =>
                await runAction({
                    label: 'test mail',
                    dryRun,
                    preflight: async () => ({ smtpServer: payload.smtpServer, port: payload.port, receiver: payload.receiver }),
                    write: () => client.sendTestMail(payload, customHeaders),
                    warnings: ['The controller logs in to this SMTP server with the given credentials and sends a test message to the receiver.'],
                })
        )
    );
}
