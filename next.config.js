/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Add necessary polyfills for Web3 libraries
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      "porto/internal": false,
      porto: false,
      "@gemini-wallet/core": false,
      "@metamask/sdk": false,
      "@safe-global/safe-apps-sdk": false,
      "@safe-global/safe-apps-provider": false,
      "@walletconnect/ethereum-provider": false,
    };

    // 移除伪造的 @metamask/sdk 别名，使用真实的 SDK
    // 注意：不再将 @metamask/sdk 指向伪造的补丁文件
    // 这样 RainbowKit 可以使用真实的钱包连接

    // Add support for .wasm files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
  // Allow external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Enable ES modules
  experimental: {
    esmExternals: 'loose',
  },
  // Transpile specific packages for compatibility
  transpilePackages: ['@wagmi/connectors', '@rainbow-me/rainbowkit', 'wagmi', '@metamask/sdk'],
};

module.exports = nextConfig;