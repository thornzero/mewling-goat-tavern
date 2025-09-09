globalThis.process ??= {}; globalThis.process.env ??= {};
import { z as decodeKey } from './chunks/astro/server_BOeqx9Pa.mjs';
import './chunks/astro-designed-error-pages_BecKpcxA.mjs';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/noop-middleware_daDGk8ag.mjs';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/","cacheDir":"file:///home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/node_modules/.astro/","outDir":"file:///home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/dist/","srcDir":"file:///home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/","publicDir":"file:///home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/public/","buildClientDir":"file:///home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/dist/","buildServerDir":"file:///home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/dist/_worker.js/","adapterName":"@astrojs/cloudflare","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"results/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/results","isIndex":false,"type":"page","pattern":"^\\/results\\/?$","segments":[[{"content":"results","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/results.astro","pathname":"/results","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"test/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/test","isIndex":false,"type":"page","pattern":"^\\/test\\/?$","segments":[[{"content":"test","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/test.astro","pathname":"/test","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/assets/page.DTIbhfSr.js"}],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/assets/page.DTIbhfSr.js"}],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_actions/[...path]","pattern":"^\\/_actions(?:\\/(.*?))?\\/?$","segments":[[{"content":"_actions","dynamic":false,"spread":false}],[{"content":"...path","dynamic":true,"spread":true}]],"params":["...path"],"component":"node_modules/astro/dist/actions/runtime/route.js","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/results.astro",{"propagation":"none","containsHead":true}],["/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/test.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000astro-internal:middleware":"_astro-internal_middleware.mjs","\u0000astro-internal:actions":"_astro-internal_actions.mjs","\u0000@astro-page:node_modules/astro/dist/actions/runtime/route@_@js":"pages/_actions/_---path_.astro.mjs","\u0000@astro-page:src/pages/results@_@astro":"pages/results.astro.mjs","\u0000@astro-page:src/pages/test@_@astro":"pages/test.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"index.js","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_DqznlHor.mjs","/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/node_modules/unstorage/drivers/cloudflare-kv-binding.mjs":"chunks/cloudflare-kv-binding_DMly_2Gl.mjs","/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/node_modules/@astrojs/cloudflare/dist/entrypoints/image-service.js":"chunks/image-service_yWZxhZ-q.mjs","/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/results.astro?astro&type=script&index=0&lang.ts":"assets/results.astro_astro_type_script_index_0_lang.CwNCay3R.js","/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/results.astro?astro&type=script&index=1&lang.ts":"assets/results.astro_astro_type_script_index_1_lang.CevNE9_C.js","/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/test.astro?astro&type=script&index=0&lang.ts":"assets/test.astro_astro_type_script_index_0_lang.CVREuwzB.js","/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/test.astro?astro&type=script&index=1&lang.ts":"assets/test.astro_astro_type_script_index_1_lang.CevNE9_C.js","/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/index.astro?astro&type=script&index=0&lang.ts":"assets/index.astro_astro_type_script_index_0_lang.B-kwc2ZY.js","/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/components/Button.astro?astro&type=script&index=0&lang.ts":"assets/Button.astro_astro_type_script_index_0_lang.0RMjG_5u.js","astro:scripts/page.js":"assets/page.DTIbhfSr.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[["/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/results.astro?astro&type=script&index=1&lang.ts","window.API_CONFIG={PROXY_URL:typeof window<\"u\"?window.location.origin:\"\",ACTIONS:{DEBUG:\"/api?action=debug\",LIST_MOVIES:\"/api?action=listMovies\",SEARCH:\"/api?action=search\",MOVIE:\"/api?action=movie\",VOTE:\"/api?action=vote\",BATCH_VOTE:\"/api?action=batchVote\",UPDATE_APPEAL:\"/api?action=updateAppeal\"}};"],["/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/pages/test.astro?astro&type=script&index=1&lang.ts","window.API_CONFIG={PROXY_URL:typeof window<\"u\"?window.location.origin:\"\",ACTIONS:{DEBUG:\"/api?action=debug\",LIST_MOVIES:\"/api?action=listMovies\",SEARCH:\"/api?action=search\",MOVIE:\"/api?action=movie\",VOTE:\"/api?action=vote\",BATCH_VOTE:\"/api?action=batchVote\",UPDATE_APPEAL:\"/api?action=updateAppeal\"}};"],["/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/components/Button.astro?astro&type=script&index=0&lang.ts","const o=document.querySelector(`#${Astro.props.id||\"button\"}`);o&&Astro.props.onClick&&o.addEventListener(\"click\",t=>{t.preventDefault(),!Astro.props.disabled&&!Astro.props.loading&&Astro.props.onClick()});"]],"assets":["/assets/index.Dq8GaGa7.css","/assets/index.t68uTCcg.css","/assets/results.DcS1D30C.css","/android-chrome-192x192.png","/android-chrome-512x512.png","/apple-touch-icon.png","/favicon-16x16.png","/favicon-32x32.png","/favicon.ico","/favicon.svg","/site.webmanifest","/_worker.js/_@astrojs-ssr-adapter.mjs","/_worker.js/_astro-internal_actions.mjs","/_worker.js/_astro-internal_middleware.mjs","/_worker.js/index.js","/_worker.js/renderers.mjs","/assets/index.astro_astro_type_script_index_0_lang.B-kwc2ZY.js","/assets/page.DTIbhfSr.js","/assets/results.astro_astro_type_script_index_0_lang.CwNCay3R.js","/assets/test.astro_astro_type_script_index_0_lang.CVREuwzB.js","/js/script.js","/js/tsconfig-script.tsbuildinfo","/_worker.js/assets/index.Dq8GaGa7.css","/_worker.js/assets/index.t68uTCcg.css","/_worker.js/assets/results.DcS1D30C.css","/_worker.js/chunks/Header_DHegHpPP.mjs","/_worker.js/chunks/Layout_B3_ucrVB.mjs","/_worker.js/chunks/LoadingSpinner_BGf6hP4h.mjs","/_worker.js/chunks/_@astrojs-ssr-adapter_tgK463vt.mjs","/_worker.js/chunks/astro-designed-error-pages_BecKpcxA.mjs","/_worker.js/chunks/astro_DZP1GAvm.mjs","/_worker.js/chunks/cloudflare-kv-binding_DMly_2Gl.mjs","/_worker.js/chunks/generic_Bnr1Yc0R.mjs","/_worker.js/chunks/image-service_yWZxhZ-q.mjs","/_worker.js/chunks/index_M85zie2b.mjs","/_worker.js/chunks/noop-middleware_daDGk8ag.mjs","/_worker.js/chunks/path_lFLZ0pUM.mjs","/_worker.js/pages/_image.astro.mjs","/_worker.js/pages/index.astro.mjs","/_worker.js/pages/results.astro.mjs","/_worker.js/pages/test.astro.mjs","/js/components/ErrorBoundary.js","/js/components/FormValidator.js","/js/lib/api-client.js","/js/lib/api-config.js","/js/lib/api-error-wrapper.js","/js/lib/api-utils.js","/js/lib/client-types.js","/js/lib/database.js","/js/lib/error-handler.js","/js/lib/global-types.js","/js/lib/input-security.js","/js/lib/input-validation.js","/js/lib/lazy-loader.js","/js/lib/mobile-swiper.js","/js/lib/mobile-utils.js","/js/lib/touch-handler.js","/js/scripts/script-optimized.js","/js/scripts/script-simple.js","/js/scripts/script.js","/_worker.js/chunks/astro/server_BOeqx9Pa.mjs","/_worker.js/pages/_actions/_---path_.astro.mjs","/assets/page.DTIbhfSr.js","/results/index.html","/test/index.html","/index.html"],"buildFormat":"directory","checkOrigin":true,"serverIslandNameMap":[],"key":"St9BNcM0VhPTBSe8f3ef6wJrgCsceofLuq8M0MZBJvs=","sessionConfig":{"driver":"cloudflare-kv-binding","options":{"binding":"SESSION"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/cloudflare-kv-binding_DMly_2Gl.mjs');

export { manifest };
