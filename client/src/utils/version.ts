declare const __APP_COMMIT_HASH__: string;
declare const __APP_BUILD_TIME__: string;

export const APP_BUILD_COMMIT: string = typeof __APP_COMMIT_HASH__ !== 'undefined' ? __APP_COMMIT_HASH__ : 'development';
export const APP_BUILD_TIME: string = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 'local';
