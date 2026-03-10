// S3 Service Module — single source of truth for all S3 operations

export { s3Client, BUCKET } from './client';

export type { UploadType, AspectRatio, KeyPrefix } from './keys';
export {
    BREAKPOINTS,
    generateUploadKey,
    approvedKey,
    trashKeyFrom,
    keyHash,
    aspectSlug,
    thumbKey,
    ogThumbKey,
    categoryOgKey,
    parsePrefix,
    resolveKey,
    heightForAspect,
    snapToBreakpoint,
} from './keys';

export type { UploadResult } from './operations';
export {
    upload,
    getBuffer,
    exists,
    deleteObject,
    copyObject,
    moveObject,
    listByPrefix,
    putObject,
    // Backward-compat aliases
    uploadFile,
    deleteFile,
    getFileBuffer,
    getFileUrl,
} from './operations';

export type { VariantResult } from './responsive';
export { generateResponsiveSet, generateOgImage } from './responsive';
