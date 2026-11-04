export {env} from 'cloudflare:workers';
export const platform:string='cloudflare';
export const isDevelopment=import.meta.env.DEV;
export {MAX_UPLOAD_BYTES as uploadMaxBytes} from '../upload-limits';
