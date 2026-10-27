export {env} from 'cloudflare:workers';
export const platform:string='sites';
export const isDevelopment=import.meta.env.DEV;
export const uploadMaxBytes=5*1024*1024;
