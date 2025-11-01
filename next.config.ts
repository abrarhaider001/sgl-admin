// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   // Optimize images
//   images: {
//     unoptimized: true,
//     domains: [
//       'localhost',
//       'firebasestorage.googleapis.com',
//       'card-app-1d1a8.firebasestorage.app'
//     ],
//   },
  
//   // ✅ Ignore ESLint errors during build
//   eslint: {
//     ignoreDuringBuilds: true,
//   },

//   // ✅ Ignore TypeScript errors during build (Vercel fix)
//   typescript: {
//     ignoreBuildErrors: true,
//   },

//   // Turbopack configuration
//   turbopack: {
//     // Set the correct root directory to resolve workspace warnings
//     root: process.cwd(),
//     rules: {
//       '*.svg': {
//         loaders: ['@svgr/webpack'],
//         as: '*.js',
//       },
//     },
//     // Resolve aliases for faster module resolution
//     resolveAlias: {
//       '@': './src',
//     },
//   },
  
//   // Server external packages (moved from experimental)
//   serverExternalPackages: ['xlsx'],
  
//   // Enable experimental features for better performance
//   experimental: {
//     // Optimize CSS
//     optimizeCss: true,
//     // Optimize package imports for faster bundling
//     optimizePackageImports: ['react-icons'],
//   },
  
//   // Webpack optimizations (only for non-Turbopack builds)
//   webpack: (config, { dev, isServer }) => {
//     if (dev && !process.env.TURBOPACK) {
//       // Development optimizations for webpack
//       config.watchOptions = {
//         poll: 1000,
//         aggregateTimeout: 300,
//         ignored: ['**/node_modules', '**/.next'],
//       };
      
//       // Reduce memory usage
//       config.optimization = {
//         ...config.optimization,
//         removeAvailableModules: false,
//         removeEmptyChunks: false,
//         splitChunks: false,
//       };
//     }
    
//     // Resolve fallbacks for better compatibility
//     config.resolve.fallback = {
//       ...config.resolve.fallback,
//       canvas: false,
//       fs: false,
//     };
    
//     return config;
//   },
  
//   // Compiler optimizations
//   compiler: {
//     // Remove console logs in production
//     removeConsole: process.env.NODE_ENV === 'production',
//   },
  
//   // Output optimizations
//   poweredByHeader: false,
//   compress: true,
// };

// export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    unoptimized: true,
    domains: [
      'localhost',
      'firebasestorage.googleapis.com',
      'card-app-1d1a8.firebasestorage.app'
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
        ignored: ['**/node_modules', '**/.next'],
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
