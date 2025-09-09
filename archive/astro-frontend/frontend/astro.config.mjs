// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    imageService: "cloudflare",
    platformProxy: {
      enabled: true
    }
  }),

  vite: {
    plugins: [],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'swiper': ['swiper'],
            'api': ['/src/scripts/types.ts']
          }
        }
      }
    },
    optimizeDeps: {
      include: ['swiper']
    }
  },

  // Performance optimizations
  build: {
    inlineStylesheets: 'auto',
    assets: 'assets'
  },

  // Security headers
  security: {
    checkOrigin: true
  },

  // Image optimization
  image: {
    domains: ['image.tmdb.org', 'cdn.jsdelivr.net'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**'
      }
    ]
  },

  // Compression
  compressHTML: true,

  // Prefetch
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },

  // Experimental features
  experimental: {
    // Add experimental features as they become available
  }
});