'use client';

import React, { ReactNode } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Coins, Zap, ArrowUpRight, MoreVertical } from 'lucide-react';
import { cn, formatAmount } from '@/lib/utils';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  balanceUSD: number;
  price: number;
  change24h: number;
  chainId: number;
  address?: string;
  logo?: string;
  decimals: number;
}

export interface AssetTileProps {
  asset: Asset;
  compact?: boolean;
  showActions?: boolean;
  selected?: boolean;
  onClick?: (asset: Asset) => void;
  className?: string;
}

const AssetTile = ({
  asset,
  compact = false,
  showActions = true,
  selected = false,
  onClick,
  className,
}: AssetTileProps) => {
  const isPositive = asset.change24h > 0;
  const isNegative = asset.change24h < 0;

  // 链颜色
  const getChainColor = (chainId: number) => {
    switch (chainId) {
      case 421614: return 'bg-arbitrum/20 text-arbitrum'; // Arbitrum Sepolia
      case 84532: return 'bg-base/20 text-base'; // Base Sepolia
      case 11155111: return 'bg-ethereum/20 text-ethereum'; // Sepolia
      default: return 'bg-tech-gray text-gray-300';
    }
  };

  // 链名称
  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 421614: return 'Arbitrum';
      case 84532: return 'Base';
      case 11155111: return 'Sepolia';
      default: return `Chain ${chainId}`;
    }
  };

  // 代币图标占位符
  const renderTokenIcon = () => {
    if (asset.logo) {
      return (
        <img 
          src={asset.logo} 
          alt={asset.symbol}
          className="w-10 h-10 rounded-full"
        />
      );
    }

    // 根据代币符号显示不同的颜色
    const tokenColors: Record<string, string> = {
      'USDC': 'bg-blue-500/20 text-blue-400',
      'ETH': 'bg-gray-500/20 text-gray-300',
      'WBTC': 'bg-orange-500/20 text-orange-400',
      'DAI': 'bg-yellow-500/20 text-yellow-400',
      'USDT': 'bg-green-500/20 text-green-400',
    };

    const colorClass = tokenColors[asset.symbol] || 'bg-ai-purple/20 text-ai-purple';
    
    return (
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', colorClass)}>
        <Coins className="w-5 h-5" />
      </div>
    );
  };

  // 紧凑模式
  if (compact) {
    return (
      <div
        className={cn(
          'ai-card p-4 cursor-pointer transition-all duration-300 hover:bg-tech-gray/50',
          selected && 'ring-2 ring-ai-blue/50',
          className
        )}
        onClick={() => onClick?.(asset)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {renderTokenIcon()}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-white">{asset.symbol}</h4>
                <span className="text-xs px-2 py-0.5 rounded bg-tech-gray text-gray-300">
                  {getChainName(asset.chainId)}
                </span>
              </div>
              <p className="text-sm text-gray-400">{asset.name}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="font-medium text-white">
              {formatAmount(asset.balance, 4)}
            </div>
            <div className="text-sm text-gray-400">
              ${formatAmount(asset.balanceUSD, 2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 完整模式
  return (
    <div
      className={cn(
        'ai-card p-5 cursor-pointer transition-all duration-300 hover:bg-tech-gray/30',
        selected && 'ring-2 ring-ai-blue/50',
        className
      )}
      onClick={() => onClick?.(asset)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {renderTokenIcon()}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{asset.symbol}</h3>
              <span className={cn('text-xs font-medium px-2 py-1 rounded', getChainColor(asset.chainId))}>
                {getChainName(asset.chainId)}
              </span>
            </div>
            <p className="text-sm text-gray-400">{asset.name}</p>
          </div>
        </div>

        {showActions && (
          <button
            className="p-2 rounded-lg hover:bg-tech-gray text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              // 处理更多操作
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 余额信息 */}
      <div className="mb-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-white">
              {formatAmount(asset.balance, 4)} {asset.symbol}
            </div>
            <div className="text-lg font-medium text-gray-300 mt-1">
              ${formatAmount(asset.balanceUSD, 2)}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-400">Price</div>
            <div className="text-lg font-medium text-white">
              ${formatAmount(asset.price, 4)}
            </div>
          </div>
        </div>
      </div>

      {/* 24小时变化 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : isNegative ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <DollarSign className="w-4 h-4 text-gray-400" />
          )}
          <span className={cn(
            'text-sm font-medium',
            isPositive && 'text-green-500',
            isNegative && 'text-red-500',
            !isPositive && !isNegative && 'text-gray-400'
          )}>
            {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}% (24h)
          </span>
        </div>

        <div className="text-xs text-gray-500">
          ≈ {formatAmount(asset.balance / asset.price, 6)} ETH
        </div>
      </div>

      {/* 操作按钮 */}
      {showActions && (
        <div className="flex items-center gap-2 pt-4 border-t border-tech-gray">
          <button
            className="flex-1 py-2 px-3 rounded-lg bg-tech-gray text-gray-300 hover:bg-tech-light hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              // 处理发送操作
            }}
          >
            <ArrowUpRight className="w-3 h-3" />
            Send
          </button>
          <button
            className="flex-1 py-2 px-3 rounded-lg bg-tech-gray text-gray-300 hover:bg-tech-light hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              // 处理接收操作
            }}
          >
            <Wallet className="w-3 h-3" />
            Receive
          </button>
          <button
            className="flex-1 py-2 px-3 rounded-lg bg-ai-blue/20 text-ai-blue hover:bg-ai-blue/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              // 处理交换操作
            }}
          >
            <Zap className="w-3 h-3" />
            Swap
          </button>
        </div>
      )}

      {/* 装饰元素 */}
      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-ai-blue animate-pulse" />
      <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-ai-purple animate-pulse delay-300" />
    </div>
  );
};

// 资产组组件
export interface AssetGroupProps {
  title: string;
  description?: string;
  assets: Asset[];
  totalValue?: number;
  className?: string;
}

export const AssetGroup = ({
  title,
  description,
  assets,
  totalValue,
  className,
}: AssetGroupProps) => {
  const calculatedTotal = totalValue || assets.reduce((sum, asset) => sum + asset.balanceUSD, 0);
  
  return (
    <div className={cn('ai-card p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Total Value</div>
          <div className="text-2xl font-bold text-white">
            ${formatAmount(calculatedTotal, 2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <AssetTile
            key={asset.id}
            asset={asset}
            compact
            showActions={false}
          />
        ))}
      </div>

      {/* 汇总信息 */}
      <div className="mt-6 pt-6 border-t border-tech-gray flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-arbitrum" />
            <span className="text-sm text-gray-300">Arbitrum</span>
            <span className="text-sm font-medium text-white">
              ${formatAmount(
                assets.filter(a => a.chainId === 421614).reduce((sum, a) => sum + a.balanceUSD, 0),
                2
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-base" />
            <span className="text-sm text-gray-300">Base</span>
            <span className="text-sm font-medium text-white">
              ${formatAmount(
                assets.filter(a => a.chainId === 84532).reduce((sum, a) => sum + a.balanceUSD, 0),
                2
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-ethereum" />
            <span className="text-sm text-gray-300">Ethereum</span>
            <span className="text-sm font-medium text-white">
              ${formatAmount(
                assets.filter(a => a.chainId === 11155111).reduce((sum, a) => sum + a.balanceUSD, 0),
                2
              )}
            </span>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {assets.length} assets across {new Set(assets.map(a => a.chainId)).size} chains
        </div>
      </div>
    </div>
  );
};

export default AssetTile;