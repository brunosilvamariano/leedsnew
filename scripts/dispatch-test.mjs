import { createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
const require=createRequire(import.meta.url);
globalThis.AsyncLocalStorage=AsyncLocalStorage;
export async function dispatch(url,options) {
  const {NextRequest}=require('next/server');
  const path=new URL(url).pathname;
  const file=path.startsWith('/api/auth/')?'api/auth/[...all]':path.replace(/^\//,'');
  const {routeModule}=require(`../.next/server/app/${file}/route.js`);
  return routeModule.handle(new NextRequest(url,options),{params:Promise.resolve({}),sharedContext:{buildId:'integration-test',deploymentId:'integration-test'},previewProps:{previewModeId:'test',previewModeEncryptionKey:'test',previewModeSigningKey:'test'},renderOpts:{supportsDynamicResponse:true,experimental:{}}});
}
