'use client';

import React, { useState, useEffect } from 'react';
import { useSimpleWalletConnect } from '@/hooks/use-wallet-connect';
import { useAccount, useChainId } from 'wagmi';
import { arbitrumSepolia, baseSepolia, sepolia } from 'viem/chains';
import { Zap, Wallet, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import ActionButton from './action-button';

export interface WalletConnectButtonProps {
  variant?: 'gradient' | 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showNetwork?: boolean;
  showBalance?: boolean;
  className?: string;
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Enhanced wallet connect button component
 * Provides real wallet connection experience, automatically detects MetaMask
 * Supports one-click connection and auto-reconnection
 */
export function WalletConnectButton({
  variant = 'gradient',
  size = 'md',
  showNetwork = true,
  showBalance = true,
  className,
  onConnect,
  onDisconnect,
  onError,
}: WalletConnectButtonProps) {
  const { connect, disconnect, isConnected, address, isConnecting, error } = useSimpleWalletConnect();
  const { chainId } = useAccount();
  const [isHovering, setIsHovering] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Handle connection state changes
  useEffect(() => {
    if (isConnected && address) {
      onConnect?.(address);
      setLastError(null);
    }
  }, [isConnected, address, onConnect]);

  // Handle errors
  useEffect(() => {
    if (error) {
      setLastError(error);
      onError?.(error);
    }
  }, [error, onError]);

  // Get chain name
  const getChainName = (chainId?: number) => {
    switch (chainId) {
      case arbitrumSepolia.id:
        return 'Arbitrum Sepolia';
      case baseSepolia.id:
        return 'Base Sepolia';
      case sepolia.id:
        return 'Sepolia';
      default:
        return `Chain ${chainId}`;
    }
  };

  // Format address
  const formatAddress = (addr?: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Handle connect click
  const handleConnectClick = async () => {
    try {
      setLastError(null);
      const success = await connect();
      if (!success && !error) {
        throw new Error('Connection failed, please check your wallet extension');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Error occurred during connection');
      setLastError(errorObj);
      onError?.(errorObj);
    }
  };

  // Handle disconnect click
  const handleDisconnectClick = async () => {
    try {
      setLastError(null);
      const success = await disconnect();
      if (success) {
        onDisconnect?.();
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Error occurred during disconnection');
      setLastError(errorObj);
      onError?.(errorObj);
    }
  };

  // Render connection state
  const renderConnectionState = () => {
    if (isConnecting) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connecting...</span>
        </div>
      );
    }

    if (isConnected && address) {
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium">{formatAddress(address)}</span>
          </div>
          {showNetwork && chainId && (
            <div className="px-2 py-1 text-xs rounded-full bg-tech-gray">
              {getChainName(chainId)}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4" />
        <span>Connect Wallet</span>
      </div>
    );
  };

  // Render error message
  const renderError = () => {
    if (!lastError) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm z-50">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Connection Error</div>
            <div className="text-xs opacity-80 mt-1">{lastError.message}</div>
            <button
              onClick={() => setLastError(null)}
              className="text-xs underline mt-2 hover:text-red-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main button content
  if (isConnected && address) {
    return (
      <div className="relative">
        <div
          className={cn(
            'flex items-center gap-3',
            'px-4 py-2.5 rounded-xl',
            'bg-tech-darker border border-tech-gray',
            'hover:bg-tech-gray/50 transition-colors',
            'cursor-pointer',
            className
          )}
          onClick={handleDisconnectClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-400" />
            <div className="text-left">
              <div className="font-medium text-white">{formatAddress(address)}</div>
              {showNetwork && chainId && (
                <div className="text-xs text-gray-400">{getChainName(chainId)}</div>
              )}
            </div>
          </div>
          {isHovering ? (
            <div className="text-red-400 text-sm">Disconnect</div>
          ) : (
            <Check className="w-4 h-4 text-green-400" />
          )}
        </div>
        {renderError()}
      </div>
    );
  }

  return (
    <div className="relative">
      <ActionButton
        variant={variant}
        size={size}
        isLoading={isConnecting}
        leftIcon={isConnecting ? undefined : <Zap className="w-4 h-4" />}
        onClick={handleConnectClick}
        className={cn('relative z-10', className)}
        pulseEffect={!isConnected && !isConnecting}
        glowEffect={!isConnected && !isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </ActionButton>
      {renderError()}
    </div>
  );
}

/**
 * 简化的钱包连接按钮，用于快速集成
 */
export function SimpleWalletConnectButton(props: Omit<WalletConnectButtonProps, 'showNetwork' | 'showBalance'>) {
  return <WalletConnectButton {...props} showNetwork={false} showBalance={false} />;
}

/**
 * 全功能钱包连接按钮，显示网络和余额
 */
export function FullWalletConnectButton(props: WalletConnectButtonProps) {
  return <WalletConnectButton {...props} showNetwork={true} showBalance={true} />;
}

export default WalletConnectButton;