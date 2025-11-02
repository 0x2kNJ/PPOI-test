/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // For server-side API routes, resolve dependencies from merchant-demo's node_modules
      // This ensures all SDK dependencies are resolved from merchant-demo where they're installed
      const merchantNodeModules = path.join(__dirname, 'node_modules');
      
      // Add merchant-demo's node_modules first for all dependencies
      config.resolve.modules = [
        merchantNodeModules,  // Merchant-demo's dependencies first
        'node_modules',  // Default
      ];
      
      // Explicitly alias all SDK dependencies to merchant-demo's versions
      // This ensures webpack resolves them correctly when bundling SDK files
      config.resolve.alias = {
        ...config.resolve.alias,
        'ethers': path.join(merchantNodeModules, 'ethers'),
        '@noble/curves': path.join(merchantNodeModules, '@noble/curves'),
        '@stablelib/x25519': path.join(merchantNodeModules, '@stablelib/x25519'),
        '@stablelib/xchacha20poly1305': path.join(merchantNodeModules, '@stablelib/xchacha20poly1305'),
        // Try to resolve poseidon2-compression-ts from merchant-demo first, then SDK if needed
        'poseidon2-compression-ts': path.join(merchantNodeModules, 'poseidon2-compression-ts'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;

