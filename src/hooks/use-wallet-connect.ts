'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { arbitrumSepolia, baseSepolia, sepolia } from 'viem/chains';

// 扩展 Window 接口以包含 ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      request?: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
      autoRefreshOnNetworkChange?: boolean;
    };
  }
}

export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'injected';

export interface WalletConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  isDisconnected: boolean;
  address?: string;
  chainId?: number;
  walletType?: WalletType;
  error?: Error;
}

export interface UseWalletConnectReturn extends WalletConnectionState {
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
  autoConnect: () => Promise<void>;
}

/**
 * 增强的钱包连接钩子，支持自动检测和连接
 * 提供真实的钱包连接体验，无模拟情况
 */
export function useWalletConnect(): UseWalletConnectReturn {
  // Wagmi 钩子
  const { address, isConnected, isReconnecting, isConnecting, chainId } = useAccount();
  const { connectAsync, connectors, error: connectError } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  
  // 本地状态
  const [walletType, setWalletType] = useState<WalletType>();
  const [error, setError] = useState<Error>();
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  // 清除错误
  useEffect(() => {
    if (connectError) {
      setError(connectError);
    }
  }, [connectError]);

  // 自动检测已安装的钱包
  const detectInstalledWallets = useCallback((): WalletType[] => {
    const installed: WalletType[] = [];
    
    // 检测 MetaMask
    if (typeof window !== 'undefined' && window.ethereum?.isMetaMask) {
      installed.push('metamask');
    }
    
    // 检测 Coinbase Wallet
    if (typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet) {
      installed.push('coinbase');
    }
    
    // 检测其他注入的钱包
    if (typeof window !== 'undefined' && window.ethereum && !window.ethereum.isMetaMask && !window.ethereum.isCoinbaseWallet) {
      installed.push('injected');
    }
    
    // WalletConnect 始终可用（通过二维码）
    installed.push('walletconnect');
    
    return installed;
  }, []);

  // 获取对应钱包类型的连接器
  const getConnector = useCallback((type: WalletType) => {
    switch (type) {
      case 'metamask':
        return injected({ target: 'metaMask' });
      case 'coinbase':
        return coinbaseWallet({
          appName: 'Nomad Arc',
          appLogoUrl: 'https://nomadarc.xyz/logo.png',
        });
      case 'walletconnect':
        return walletConnect({
          projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'dark',
            themeVariables: {
              '--wcm-z-index': '9999',
            },
          },
        });
      case 'injected':
      default:
        return injected();
    }
  }, []);

  // 连接钱包
  const connect = useCallback(async (preferredType?: WalletType) => {
    try {
      setError(undefined);
      setIsAutoConnecting(false);
      
      let walletToConnect: WalletType;
      
      if (preferredType) {
        walletToConnect = preferredType;
      } else {
        // 自动检测首选钱包
        const installed = detectInstalledWallets();
        if (installed.includes('metamask')) {
          walletToConnect = 'metamask';
        } else if (installed.includes('coinbase')) {
          walletToConnect = 'coinbase';
        } else if (installed.includes('injected')) {
          walletToConnect = 'injected';
        } else {
          walletToConnect = 'walletconnect';
        }
      }
      
      setWalletType(walletToConnect);
      const connector = getConnector(walletToConnect);
      
      console.log(`Connecting with ${walletToConnect}...`);
      await connectAsync({ connector });
      
      console.log('Wallet connected successfully');
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError(err instanceof Error ? err : new Error('Connection failed'));
      throw err;
    }
  }, [connectAsync, detectInstalledWallets, getConnector]);

  // 断开连接
  const disconnect = useCallback(async () => {
    try {
      setError(undefined);
      await disconnectAsync();
      setWalletType(undefined);
      console.log('Wallet disconnected');
    } catch (err) {
      console.error('Wallet disconnection failed:', err);
      setError(err instanceof Error ? err : new Error('Disconnection failed'));
      throw err;
    }
  }, [disconnectAsync]);

  // 切换网络
  const switchChain = useCallback(async (targetChainId: number) => {
    try {
      setError(undefined);
      await switchChainAsync({ chainId: targetChainId });
      console.log(`Switched to chain ${targetChainId}`);
    } catch (err) {
      console.error('Chain switch failed:', err);
      setError(err instanceof Error ? err : new Error('Chain switch failed'));
      throw err;
    }
  }, [switchChainAsync]);

  // 自动连接（尝试重新连接上次使用的钱包）
  const autoConnect = useCallback(async () => {
    try {
      setIsAutoConnecting(true);
      setError(undefined);
      
      // 检查是否有缓存的连接信息
      const cachedWalletType = localStorage.getItem('nomadarc_last_wallet');
      if (cachedWalletType) {
        const type = cachedWalletType as WalletType;
        console.log(`Attempting auto-connect with ${type}...`);
        
        try {
          await connect(type);
          console.log('Auto-connect successful');
        } catch (err) {
          console.log('Auto-connect failed, clearing cache');
          localStorage.removeItem('nomadarc_last_wallet');
        }
      }
    } finally {
      setIsAutoConnecting(false);
    }
  }, [connect]);

  // 保存连接信息到本地存储
  useEffect(() => {
    if (isConnected && walletType) {
      localStorage.setItem('nomadarc_last_wallet', walletType);
    } else if (!isConnected) {
      localStorage.removeItem('nomadarc_last_wallet');
    }
  }, [isConnected, walletType]);

  // 组件挂载时尝试自动连接
  useEffect(() => {
    if (!isConnected && !isConnecting && !isReconnecting) {
      autoConnect();
    }
  }, []);

  return {
    isConnected,
    isConnecting: isConnecting || isAutoConnecting,
    isReconnecting,
    isDisconnected: !isConnected && !isConnecting && !isReconnecting,
    address,
    chainId,
    walletType,
    error,
    connect,
    disconnect,
    switchChain,
    autoConnect,
  };
}

/**
 * 简化的钱包连接钩子，用于快速集成
 */
export function useSimpleWalletConnect() {
  const { connect, disconnect, isConnected, address, isConnecting, error } = useWalletConnect();
  
  const handleConnect = async () => {
    try {
      await connect();
      return true;
    } catch (err) {
      console.error('Connection error:', err);
      return false;
    }
  };
  
  const handleDisconnect = async () => {
    try {
      await disconnect();
      return true;
    } catch (err) {
      console.error('Disconnection error:', err);
      return false;
    }
  };
  
  return {
    connect: handleConnect,
    disconnect: handleDisconnect,
    isConnected,
    address,
    isConnecting,
    error,
  };
}