'use client';

import React, { useState, useEffect } from 'react';
import {
  RainbowKitProvider,
  darkTheme,
  Theme,
  getDefaultWallets,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arbitrumSepolia, baseSepolia, sepolia } from 'viem/chains';

// 创建查询客户端
const queryClient = new QueryClient();

// 支持的链
const supportedChains = [arbitrumSepolia, baseSepolia, sepolia] as const;

// 使用 getDefaultWallets 而不是 connectorsForWallets，避免复杂的依赖
const { connectors } = getDefaultWallets({
  appName: 'Direct',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
});

// 创建 Wagmi 配置
const config = createConfig({
  chains: supportedChains,
  connectors,
  transports: {
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 
      'https://sepolia-rollup.arbitrum.io/rpc'
    ),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 
      'https://sepolia.base.org'
    ),
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC || 
      'https://rpc.sepolia.org'
    ),
  },
  ssr: true,
});

// 自定义 AI Agent 主题 - 简化版本，避免重复属性
const aiAgentTheme = darkTheme({
  accentColor: '#00D1FF',
  accentColorForeground: '#0A0A0F',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
}) as Theme;

interface ProvidersProps {
  children: React.ReactNode;
}

export function ProvidersSimple({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 服务端渲染时返回 null，避免 hydration 不匹配
  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={aiAgentTheme}
          modalSize="compact"
          showRecentTransactions={true}
          appInfo={{
            appName: 'Direct',
            learnMoreUrl: 'https://docs.nomadarc.xyz',
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}