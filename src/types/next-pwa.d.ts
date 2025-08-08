declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    clientsClaim?: boolean;
    sw?: string;
    publicExcludes?: string[];
    buildExcludes?: (string | RegExp)[];
    startUrl?: string;
    dynamicStartUrl?: boolean;
    dynamicStartUrlRedirect?: string;
    fallbacks?: {
      image?: string;
      document?: string;
      font?: string;
      audio?: string;
      video?: string;
    };
    cacheStartUrl?: boolean;
    cacheOnFrontendNav?: boolean;
    subdomainPrefix?: string;
    additionalManifestEntries?: any[];
    manifestTransforms?: any[];
    modifyURLPrefix?: Record<string, string>;
    mode?: string;
    runtimeCaching?: any[];
    scope?: string;
    reloadOnOnline?: boolean;
    customWorkerDir?: string;
    workboxOptions?: any;
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withPWA;
}