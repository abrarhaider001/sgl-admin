// export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  output: "standalone",

  images: {
    unoptimized: true,
    domains: [
      'localhost',
      'firebasestorage.googleapis.com',
      'card-app-1d1a8.firebasestorage.app',
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  turbopack: {
    root: process.cwd(),
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
    resolveAlias: {
      '@': './src',
    },
  },

  serverExternalPackages: ['xlsx'],

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react-icons'],
  },

  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      // ✅ Fix client-side libraries that require Node modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        canvas: false,
      };
    }

    if (dev && !process.env.TURBOPACK) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['/node_modules', '/.next'],
      };
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    return config;
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  poweredByHeader: false,
  compress: true,
};

export default nextConfig;