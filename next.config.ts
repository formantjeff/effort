import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize canvas for server-side only
      if (Array.isArray(config.externals)) {
        config.externals.push('canvas');
      } else if (typeof config.externals === 'function') {
        const origExternals = config.externals;
        config.externals = async (context, request, callback) => {
          if (request === 'canvas') {
            return callback(undefined, 'commonjs canvas');
          }
          return origExternals(context, request, callback);
        };
      }
    }
    return config;
  },
};

export default nextConfig;
