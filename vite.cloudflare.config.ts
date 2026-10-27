import vinext from 'vinext';
import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 resolve:{alias:{'@hiramshot/runtime':fileURLToPath(new URL('./lib/runtime/cloudflare.ts',import.meta.url)),'@hiramshot/identity':fileURLToPath(new URL('./lib/identity/google.ts',import.meta.url))}},
 plugins:[vinext({nextConfig:{poweredByHeader:false,webpack(config:any){config.resolve??={};config.resolve.alias={...config.resolve.alias,'@hiramshot/runtime':fileURLToPath(new URL('./lib/runtime/cloudflare.ts',import.meta.url)),'@hiramshot/identity':fileURLToPath(new URL('./lib/identity/google.ts',import.meta.url))};return config;}}}),cloudflare({configPath:'./cloudflare/wrangler.app.jsonc',viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false})],
});
