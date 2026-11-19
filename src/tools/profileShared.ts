import type { RecordLike } from './resourceMutationShared.js';

/** Refuses the controller's own profiles (Default rate limit, built-in service types and Bonjour services). */
export function refuseBuiltInProfile(label: string): (record: RecordLike) => void {
    return (record) => {
        if (record.defaultProfile === true || record.buildIn === true) {
            throw new Error(
                `"${String(record.name ?? 'this profile')}" is a built-in ${label} and cannot be changed or deleted. No request was sent.`
            );
        }
    };
}

/** The Wi-Fi calling list is wrapped in { profileList }. */
export function wifiCallingProfiles(value: unknown): unknown[] {
    const list = (value as { profileList?: unknown } | undefined)?.profileList;
    if (!Array.isArray(list)) throw new Error('The controller returned an unexpected Wi-Fi calling profile list.');
    return list;
}
