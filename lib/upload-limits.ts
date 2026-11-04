export const MAX_UPLOAD_BYTES=10*1024*1024;
export function uploadLimitLabel(bytes=MAX_UPLOAD_BYTES){return `${bytes/1048576} MB`;}
