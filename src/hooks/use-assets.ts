'use client';

import { useAccount, useBalance, useChainId } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { Address, zeroAddress, formatUnits } from 'viem';
import { Asset } from '@/components/ui/asset-tile';
import { ERC20_ABI } from '@/constants/erc20-abi';
import { createChainClient } from '@/lib/blockchain/providers';

// 测试网代币地址
const TESTNET_TOKENS = {
  // Arbitrum Sepolia
  421614: [
    {
      address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address, // USDC
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    },
    {
      address: zeroAddress, // ETH
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    },
  ],
  // Base Sepolia
  84532: [
    {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // USDC
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    },
    {
      address: zeroAddress, // ETH
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    },
  ],
  // Sepolia
  11155111: [
    {
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address, // USDC
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    },
    {
      address: zeroAddress, // ETH
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    },
  ],
};

// 获取真实价格函数 - 使用CoinGecko API
async function getRealPrice(chainId: number, tokenSymbol: string): Promise<number> {
  try {
    // 映射代币符号到CoinGecko ID
    const tokenMap: Record<string, string> = {
      'ETH': 'ethereum',
      'USDC': 'usd-coin',
      'WBTC': 'wrapped-bitcoin',
    };
    
    const coinId = tokenMap[tokenSymbol];
    
    if (!coinId) {
      console.warn(`暂不支持 ${tokenSymbol} 的真实价格获取，使用模拟价格`);
      return getMockPrice(tokenSymbol);
    }
    
    // 使用CoinGecko公共API获取价格（使用兼容的超时方法）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        {
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`CoinGecko API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data[coinId] || !data[coinId].usd) {
        throw new Error(`CoinGecko API返回数据格式错误`);
      }
      
      const price = data[coinId].usd;
      console.log(`✅ 获取到真实${tokenSymbol}价格: $${price} (链 ${chainId})`);
      return price;
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error(`获取 ${tokenSymbol} 真实价格失败:`, error);
    // 失败时返回模拟价格
    return getMockPrice(tokenSymbol);
  }
}

// 模拟价格数据（备用）
const MOCK_PRICES: Record<string, number> = {
  ETH: 3300.20,
  USDC: 1.0,
  WBTC: 65001.67,
};

// 获取模拟价格
function getMockPrice(tokenSymbol: string): number {
  return MOCK_PRICES[tokenSymbol] || 1.0;
}

// 模拟24小时变化（实际项目中应该从API获取）
const MOCK_CHANGES: Record<string, number> = {
  ETH: 2.5,
  USDC: 0.1,
  WBTC: 1.8,
};

interface UseAssetsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * 获取用户资产的React Hook
 * 支持多链资产查询
 */
export function useAssets(options: UseAssetsOptions = {}) {
  const { enabled = true, refetchInterval = 30000 } = options;
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // 获取ETH余额
  const { data: ethBalance, isLoading: isLoadingEth } = useBalance({
    address,
    query: {
      enabled: enabled && isConnected,
      refetchInterval,
    },
  });

  // 获取当前链的代币列表
  const currentChainTokens = TESTNET_TOKENS[chainId as keyof typeof TESTNET_TOKENS] || [];

  // 获取所有代币余额
  const tokenBalances = useQuery({
    queryKey: ['tokenBalances', address, chainId],
    queryFn: async () => {
      if (!address || !isConnected) return [];

      // 创建公共客户端
      const publicClient = createChainClient(chainId);
      
      // 并行查询所有代币余额
      const balancePromises = currentChainTokens.map(async (token) => {
        try {
          let balance = 0n;
          
          if (token.address === zeroAddress) {
            // ETH余额已经通过useBalance获取
            return {
              ...token,
              balance: 0, // ETH余额将在下面单独处理
              balanceUSD: 0,
            };
          }
          
          // 查询ERC20代币余额
          const rawBalance = await publicClient.readContract({
            address: token.address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          }) as bigint;
          
          // 转换余额为小数格式
          balance = rawBalance;
          const formattedBalance = Number(formatUnits(balance, token.decimals));
          
          return {
            ...token,
            balance: formattedBalance,
            balanceUSD: 0, // 将在下面计算
            rawBalance: balance,
          };
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol}:`, error);
          // 如果查询失败，返回0余额
          return {
            ...token,
            balance: 0,
            balanceUSD: 0,
            rawBalance: 0n,
          };
        }
      });
      
      return await Promise.all(balancePromises);
    },
    enabled: enabled && isConnected,
    refetchInterval,
  });

  // Combine asset data
  const assets = useQuery({
    queryKey: ['assets', address, chainId, tokenBalances.dataUpdatedAt],
    queryFn: async () => {
      const result: Asset[] = [];

      // Add ETH asset
      if (ethBalance) {
        const ethValue = Number(ethBalance.value) / Math.pow(10, ethBalance.decimals);
        const ethPrice = await getRealPrice(chainId, 'ETH');
        const ethValueUSD = ethValue * ethPrice;

        result.push({
          id: `eth-${chainId}`,
          symbol: 'ETH',
          name: 'Ethereum',
          balance: ethValue,
          balanceUSD: ethValueUSD,
          price: ethPrice,
          change24h: 0, // Temporarily use 0, should be fetched from API in real projects
          chainId,
          address: zeroAddress,
          logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
          decimals: 18,
        });
      }

      // 添加代币资产
      if (tokenBalances.data) {
        for (const [index, token] of tokenBalances.data.entries()) {
          const price = await getRealPrice(chainId, token.symbol);
          const balanceUSD = token.balance * price;

          result.push({
            id: `${token.symbol.toLowerCase()}-${chainId}-${index}`,
            symbol: token.symbol,
            name: token.name,
            balance: token.balance,
            balanceUSD,
            price,
            change24h: MOCK_CHANGES[token.symbol] || 0,
            chainId,
            address: token.address,
            logo: token.logo,
            decimals: token.decimals,
          });
        }
      }

      // If wallet is not connected, return empty array (no demo data)
      if (!isConnected || !address) {
        return [];
      }

      return result;
    },
    enabled: enabled && isConnected, // Only enable query when wallet is connected
    refetchInterval,
  });

  return {
    assets: assets.data || [],
    isLoading: assets.isLoading || isLoadingEth,
    error: assets.error,
    refetch: assets.refetch,
    totalBalanceUSD: assets.data?.reduce((sum, asset) => sum + asset.balanceUSD, 0) || 0,
  };
}

/**
 * 获取演示资产数据（当用户未连接钱包时使用）
 */
function getDemoAssets(chainId: number): Asset[] {
  // 简单的链名称映射
  const chainNames: Record<number, string> = {
    421614: 'Arbitrum Sepolia',
    84532: 'Base Sepolia',
    11155111: 'Sepolia',
    1: 'Ethereum',
    42161: 'Arbitrum',
  };
  const chainName = chainNames[chainId] || 'Unknown';

  return [
    {
      id: '1',
      symbol: 'USDC',
      name: 'USD Coin',
      balance: 1250.75,
      balanceUSD: 1250.75,
      price: 1.0,
      change24h: 0.1,
      chainId,
      address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address,
      logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      decimals: 6,
    },
    {
      id: '2',
      symbol: 'ETH',
      name: 'Ethereum',
      balance: 2.5,
      balanceUSD: 8250.50,
      price: 3300.20,
      change24h: 2.5,
      chainId,
      address: zeroAddress,
      logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      decimals: 18,
    },
    {
      id: '3',
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      balance: 0.15,
      balanceUSD: 9750.25,
      price: 65001.67,
      change24h: 1.8,
      chainId,
      address: '0x...' as Address,
      logo: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png',
      decimals: 8,
    },
  ];
}

/**
 * 获取单个资产详情
 */
export function useAsset(assetId: string) {
  const { assets, isLoading } = useAssets();
  
  return {
    asset: assets.find(a => a.id === assetId),
    isLoading,
  };
}

/**
 * 获取跨链资产汇总
 */
export function useCrossChainAssets() {
  const { assets, isLoading, totalBalanceUSD } = useAssets();
  
  // 按链分组
  const assetsByChain = assets.reduce((acc, asset) => {
    if (!acc[asset.chainId]) {
      acc[asset.chainId] = [];
    }
    acc[asset.chainId].push(asset);
    return acc;
  }, {} as Record<number, Asset[]>);

  return {
    assetsByChain,
    totalBalanceUSD,
    isLoading,
    chainCount: Object.keys(assetsByChain).length,
  };
}