// S3 Service Module — single source of truth for all S3 operations

export { s3Client, BUCKET } from './client';

export type { UploadType, AspectRatio } from './keys';
export {
    BREAKPOINTS,
    generateUploadKey,
    trashKeyFrom,
    thumbKey,
    ogThumbKey,
    categoryOgKey,
    parsePrefix,
    heightForAspect,
    snapToBreakpoint,
} from './keys';

export { upload, getBuffer, exists, deleteObject, moveObject, putObject } from './operations';
