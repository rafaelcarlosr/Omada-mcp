import type { RecordLike } from './resourceMutationShared.js';

/** Surveys are read back with isPublished; the request field is published. */
export function surveyRecord(record: RecordLike): RecordLike {
    const { isPublished, ...rest } = record;
    return isPublished === undefined ? rest : { ...rest, published: isPublished };
}
