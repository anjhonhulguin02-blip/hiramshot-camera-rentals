import {purgeExpired} from '../lib/purge';
// The scheduler has no HTTP maintenance endpoint or public bypass.
export default {
 fetch(){return new Response('Not found',{status:404});},
 async scheduled(_event:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){ctx.waitUntil(purgeExpired(env));},
};
