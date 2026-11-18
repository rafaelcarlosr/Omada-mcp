import { z } from 'zod';

import { vpnUserConfigVOSchema } from '../omadaClient/requestSchemas.js';
import type { RecordLike } from './resourceMutationShared.js';

/** Built-in SSL VPN resource groups ("ALL" and "LAN") that cannot be changed or removed. */
export const BUILT_IN_SSL_VPN_RESOURCE_GROUPS: readonly string[] = ['resourceGroupAll', 'resourceGroupLan'];

/** Sorted IDs from a list of IDs or of `{ id, name }` objects; order is not meaningful to the controller. */
export function sortedIds(list: unknown): string[] | undefined {
    if (!Array.isArray(list)) return undefined;
    return list
        .map((entry) => (typeof entry === 'object' && entry !== null && 'id' in entry ? (entry as { id: unknown }).id : entry))
        .filter((entry): entry is string => typeof entry === 'string')
        .sort();
}

/** Return a copy whose `key` list holds sorted IDs, so request and readback compare in the same order. */
export function withSortedIds<T extends RecordLike>(record: T, key: string): T {
    const ids = sortedIds(record[key]);
    return ids === undefined ? record : { ...record, [key]: ids };
}

/** VPN user account as the v3 routes accept it; the controller rejects writes without username, password and protocol. */
export const vpnUserPayloadSchema = vpnUserConfigVOSchema.extend({
    username: z.string().min(1).describe('Username of the VPN user.'),
    password: z.string().min(1).describe('Password of the VPN user. Write-only: these tools never return it.'),
    protocol: z.number().int().min(0).max(2).describe('Protocol: 0 L2TP or PPTP, 1 OpenVPN, 2 SSL VPN.'),
});
