import type { NextConfig } from "next";
import path from 'node:path';

const nextConfig: NextConfig = {
  poweredByHeader:false,
  serverExternalPackages:['@aws-sdk/client-s3'],
  turbopack:{resolveAlias:{'@hiramshot/runtime':'./lib/runtime/vercel.ts','@hiramshot/identity':'./lib/identity/google.ts'}},
  webpack(config){config.resolve.alias={...config.resolve.alias,'@hiramshot/runtime':path.resolve('lib/runtime/vercel.ts'),'@hiramshot/identity':path.resolve('lib/identity/google.ts')};return config;},
};

export default nextConfig;
