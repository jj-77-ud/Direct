'use client';

import React from 'react';
import { RainbowKitProvider, darkTheme, Theme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arbitrumSepolia, baseSepolia, sepolia } from 'viem/chains';

// 创建查询客户端
const queryClient = new QueryClient();

// 支持的链 - 使用 as const 确保类型正确
const supportedChains = [arbitrumSepolia, baseSepolia, sepolia] as const;

// 创建 Wagmi 配置
const config = createConfig({
  chains: supportedChains,
  transports: {
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc'),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://rpc.sepolia.org'),
  },
  ssr: true,
});

// 自定义 AI Agent 主题
const aiAgentTheme: Theme = {
  ...darkTheme({
    accentColor: '#00D1FF',
    accentColorForeground: 'white',
    borderRadius: 'large',
    fontStack: 'system',
    overlayBlur: 'small',
  }),
  colors: {
    ...darkTheme().colors,
    accentColor: '#00D1FF',
    accentColorForeground: '#0A0A0F',
    actionButtonBorder: 'rgba(0, 209, 255, 0.2)',
    actionButtonBorderMobile: 'rgba(0, 209, 255, 0.2)',
    actionButtonSecondaryBackground: 'rgba(10, 10, 15, 0.8)',
    closeButton: '#9D4EDD',
    closeButtonBackground: 'rgba(157, 78, 221, 0.1)',
    connectButtonBackground: 'linear-gradient(135deg, #00D1FF 0%, #9D4EDD 50%, #FF006E 100%)',
    connectButtonBackgroundError: '#FF006E',
    connectButtonInnerBackground: 'rgba(10, 10, 15, 0.9)',
    connectButtonText: '#FFFFFF',
    connectButtonTextError: '#FFFFFF',
    connectionIndicator: '#00F5D4',
    downloadBottomCardBackground: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%)',
    downloadTopCardBackground: 'linear-gradient(135deg, #1A1A2E 0%, #2D2D44 100%)',
    error: '#FF006E',
    generalBorder: 'rgba(0, 209, 255, 0.2)',
    generalBorderDim: 'rgba(0, 209, 255, 0.1)',
    menuItemBackground: 'rgba(0, 209, 255, 0.1)',
    modalBackdrop: 'rgba(10, 10, 15, 0.8)',
    modalBackground: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%)',
    modalBorder: 'rgba(0, 209, 255, 0.3)',
    modalText: '#FFFFFF',
    modalTextDim: '#A0A0C0',
    modalTextSecondary: '#9D4EDD',
    profileAction: 'rgba(0, 209, 255, 0.1)',
    profileActionHover: 'rgba(0, 209, 255, 0.2)',
    profileForeground: 'rgba(10, 10, 15, 0.8)',
    selectedOptionBorder: 'rgba(0, 209, 255, 0.5)',
    standby: '#9D4EDD',
  },
  fonts: {
    body: 'Inter, system-ui, sans-serif',
  },
  radii: {
    actionButton: '12px',
    connectButton: '16px',
    menuButton: '12px',
    modal: '24px',
    modalMobile: '20px',
  },
  shadows: {
    connectButton: '0px 4px 20px rgba(0, 209, 255, 0.3)',
    dialog: '0px 8px 32px rgba(0, 0, 0, 0.5)',
    profileDetailsAction: '0px 2px 10px rgba(0, 209, 255, 0.2)',
    selectedOption: '0px 2px 10px rgba(0, 209, 255, 0.3)',
    selectedWallet: '0px 2px 10px rgba(0, 209, 255, 0.3)',
    walletLogo: '0px 4px 15px rgba(0, 209, 255, 0.3)',
  },
};

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
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