import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetIncidentStatusTool } from '../../src/tools/setIncidentStatus.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setIncidentStatus', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>[];

    beforeEach(() => {
        state = [
            { id: 'i-1', status: 0 },
            { id: 'i-2', status: 0 },
        ];
        client = {
            listAnomalyIncidents: vi.fn(async () => ({ data: state })),
            setIncidentStatus: vi.fn(async () => undefined),
            deleteIncidents: vi.fn((ids: string[]) => {
                state = state.filter((incident) => !ids.includes(String(incident.id)));
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetIncidentStatusTool(server, client as unknown as OmadaClient);
    });

    it('previews the incidents, then sets the status of only the listed IDs', async () => {
        expect((await handler({ incidentIds: ['i-1'], targetStatus: 1, startTime: 1, endTime: 2 }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { target: { targetStatus: 1, incidents: [{ id: 'i-1' }] } },
        });
        await handler({ incidentIds: ['i-1'], targetStatus: 1, startTime: 1, endTime: 2, siteId: 's-1', dryRun: false }, {});
        expect(client.setIncidentStatus).toHaveBeenCalledWith(['i-1'], 1, 's-1', undefined);
        expect(client.listAnomalyIncidents).toHaveBeenCalledWith({ startTime: 1, endTime: 2 }, 1, 100, {}, 's-1', undefined);
    });

    it('refuses unknown incidents, reversed periods and invalid statuses', async () => {
        await expect(handler({ incidentIds: ['i-9'], targetStatus: 1, startTime: 1, endTime: 2, dryRun: false }, {})).rejects.toThrow(
            'No incident with id i-9'
        );
        await expect(handler({ incidentIds: ['i-1'], targetStatus: 1, startTime: 2, endTime: 1 }, {})).rejects.toThrow(
            'startTime must be before endTime.'
        );
        expect(() => definition.inputSchema.targetStatus.parse(3)).toThrow();
        client.listAnomalyIncidents.mockResolvedValueOnce(undefined);
        await expect(handler({ incidentIds: ['i-1'], targetStatus: 1, startTime: 1, endTime: 2 }, {})).rejects.toThrow('No incident');
        client.setIncidentStatus.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ incidentIds: ['i-1'], targetStatus: 2, startTime: 1, endTime: 2, dryRun: false }, {})).rejects.toThrow(
            '(errorCode -1001): rejected'
        );
    });
});
