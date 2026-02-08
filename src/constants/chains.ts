/**
 * Direct Chain Configuration Constants
 * 
 * This file defines all blockchain network configurations supported by the project.
 * Based on data provided by viem/chains, ensuring absolute correctness.
 */

import {
  arbitrumSepolia,
  baseSepolia,
  sepolia,
  mainnet,
  arbitrum,
  base,
  optimism,
  polygon,
  avalanche,
  bsc,
} from 'viem/chains'

import { type BlockchainNetwork } from '@/types/blockchain'

// ==================== Environment Variable Configuration ====================

// BuildBear Arbitrum Sandbox Environment RPC
const ARBITRUM_SANDBOX_RPC = process.env.NEXT_PUBLIC_ARBITRUM_SANDBOX_RPC || 'https://rpc.buildbear.io/compatible-ironman-b68d3c41'

// ==================== Supported Chain Configurations ====================

/**
 * All chain configurations supported by the project
 */
export const SUPPORTED_CHAINS: Record<number, BlockchainNetwork> = {
  // Testnets
  [arbitrumSepolia.id]: {
    id: arbitrumSepolia.id,
    name: arbitrumSepolia.name,
    nativeCurrency: arbitrumSepolia.nativeCurrency,
    rpcUrls: {
      default: { http: [...arbitrumSepolia.rpcUrls.default.http] },
      public: 'public' in arbitrumSepolia.rpcUrls ? { http: [...(arbitrumSepolia.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: arbitrumSepolia.blockExplorers,
    testnet: true,
  },
  [baseSepolia.id]: {
    id: baseSepolia.id,
    name: baseSepolia.name,
    nativeCurrency: baseSepolia.nativeCurrency,
    rpcUrls: {
      default: { http: [...baseSepolia.rpcUrls.default.http] },
      public: 'public' in baseSepolia.rpcUrls ? { http: [...(baseSepolia.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: baseSepolia.blockExplorers,
    testnet: true,
  },
  [sepolia.id]: {
    id: sepolia.id,
    name: sepolia.name,
    nativeCurrency: sepolia.nativeCurrency,
    rpcUrls: {
      default: { http: [...sepolia.rpcUrls.default.http] },
      public: 'public' in sepolia.rpcUrls ? { http: [...(sepolia.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: sepolia.blockExplorers,
    testnet: true,
  },
  
  // Mainnets
  [mainnet.id]: {
    id: mainnet.id,
    name: mainnet.name,
    nativeCurrency: mainnet.nativeCurrency,
    rpcUrls: {
      default: { http: [...mainnet.rpcUrls.default.http] },
      public: 'public' in mainnet.rpcUrls ? { http: [...(mainnet.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: mainnet.blockExplorers,
    testnet: false,
  },
  [arbitrum.id]: {
    id: arbitrum.id,
    name: 'Arbitrum (BuildBear Sandbox)',
    nativeCurrency: arbitrum.nativeCurrency,
    rpcUrls: {
      default: { http: [ARBITRUM_SANDBOX_RPC] },
      public: { http: [ARBITRUM_SANDBOX_RPC] },
    },
    blockExplorers: {
      default: {
        name: 'BuildBear Explorer',
        url: 'https://explorer.buildbear.io/compatible-ironman-b68d3c41',
      },
    },
    testnet: false, // Keep false for compatibility with LI.FI SDK
  },
  [base.id]: {
    id: base.id,
    name: base.name,
    nativeCurrency: base.nativeCurrency,
    rpcUrls: {
      default: { http: [...base.rpcUrls.default.http] },
      public: 'public' in base.rpcUrls ? { http: [...(base.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: base.blockExplorers,
    testnet: false,
  },
  [optimism.id]: {
    id: optimism.id,
    name: optimism.name,
    nativeCurrency: optimism.nativeCurrency,
    rpcUrls: {
      default: { http: [...optimism.rpcUrls.default.http] },
      public: 'public' in optimism.rpcUrls ? { http: [...(optimism.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: optimism.blockExplorers,
    testnet: false,
  },
  [polygon.id]: {
    id: polygon.id,
    name: polygon.name,
    nativeCurrency: polygon.nativeCurrency,
    rpcUrls: {
      default: { http: [...polygon.rpcUrls.default.http] },
      public: 'public' in polygon.rpcUrls ? { http: [...(polygon.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: polygon.blockExplorers,
    testnet: false,
  },
  [avalanche.id]: {
    id: avalanche.id,
    name: avalanche.name,
    nativeCurrency: avalanche.nativeCurrency,
    rpcUrls: {
      default: { http: [...avalanche.rpcUrls.default.http] },
      public: 'public' in avalanche.rpcUrls ? { http: [...(avalanche.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: avalanche.blockExplorers,
    testnet: false,
  },
  [bsc.id]: {
    id: bsc.id,
    name: bsc.name,
    nativeCurrency: bsc.nativeCurrency,
    rpcUrls: {
      default: { http: [...bsc.rpcUrls.default.http] },
      public: 'public' in bsc.rpcUrls ? { http: [...(bsc.rpcUrls as any).public.http] } : undefined,
    },
    blockExplorers: bsc.blockExplorers,
    testnet: false,
  },
  
  // Circle Arc Testnet (custom chain)
  5042002: {
    id: 5042002,
    name: 'Circle Arc Testnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: ['https://rpc.arc-testnet.io'] },
    },
    blockExplorers: {
      default: {
        name: 'Arc Testnet Explorer',
        url: 'https://explorer.arc-testnet.io',
      },
    },
    testnet: true,
  },
}

// ==================== Chain ID Constants ====================

/**
 * Chain ID enumeration (for convenience)
 */
export enum ChainId {
  // Testnets
  ARBITRUM_SEPOLIA = arbitrumSepolia.id,
  BASE_SEPOLIA = baseSepolia.id,
  SEPOLIA = sepolia.id,
  CIRCLE_ARC_TESTNET = 5042002,
  
  // Sandbox/fork networks
  BUILD_BEAR_ARBITRUM_SANDBOX = 31337, // BuildBear Arbitrum Sandbox
  
  // Mainnets
  ETHEREUM = mainnet.id,
  ARBITRUM = arbitrum.id,
  BASE = base.id,
  OPTIMISM = optimism.id,
  POLYGON = polygon.id,
  AVALANCHE = avalanche.id,
  BSC = bsc.id,
}

/**
 * Default chain configuration
 */
export const DEFAULT_CHAIN_ID = ChainId.ARBITRUM_SEPOLIA

/**
 * Testnet chain ID list
 */
export const TESTNET_CHAIN_IDS = [
  ChainId.ARBITRUM_SEPOLIA,
  ChainId.BASE_SEPOLIA,
  ChainId.SEPOLIA,
  ChainId.CIRCLE_ARC_TESTNET,
]

/**
 * Mainnet chain ID list
 */
export const MAINNET_CHAIN_IDS = [
  ChainId.ETHEREUM,
  ChainId.ARBITRUM,
  ChainId.BASE,
  ChainId.OPTIMISM,
  ChainId.POLYGON,
  ChainId.AVALANCHE,
  ChainId.BSC,
]

// ==================== Chain Information Utility Functions ====================

/**
 * Get chain configuration
 */
export function getChainConfig(chainId: number): BlockchainNetwork {
  const config = SUPPORTED_CHAINS[chainId]
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  return config
}

/**
 * Get chain name
 */
export function getChainName(chainId: number): string {
  return getChainConfig(chainId).name
}

/**
 * Check if chain is testnet
 */
export function isTestnet(chainId: number): boolean {
  return TESTNET_CHAIN_IDS.includes(chainId)
}

/**
 * Check if chain is mainnet
 */
export function isMainnet(chainId: number): boolean {
  return MAINNET_CHAIN_IDS.includes(chainId)
}

/**
 * Get chain's native currency symbol
 */
export function getNativeCurrencySymbol(chainId: number): string {
  return getChainConfig(chainId).nativeCurrency.symbol
}

/**
 * Get chain's block explorer URL
 */
export function getBlockExplorerUrl(chainId: number): string | undefined {
  return getChainConfig(chainId).blockExplorers?.default.url
}

/**
 * Get chain's default RPC URL
 */
export function getDefaultRpcUrl(chainId: number): string {
  const config = getChainConfig(chainId)
  return config.rpcUrls.default.http[0]
}

/**
 * Get all supported chain IDs list
 */
export function getAllSupportedChainIds(): number[] {
  return Object.keys(SUPPORTED_CHAINS).map(Number)
}

/**
 * Get all supported chain configurations list
 */
export function getAllSupportedChains(): BlockchainNetwork[] {
  return Object.values(SUPPORTED_CHAINS)
}

// ==================== Project-Specific Chain Configuration ====================

/**
 * Nomad Arc primary supported chains (for bounty requirements)
 */
export const BOUNTY_SUPPORTED_CHAINS = {
  // Uniswap v4 requirement: Arbitrum Sepolia
  UNISWAP_V4: ChainId.ARBITRUM_SEPOLIA,
  
  // Circle CCTP requirement: Arbitrum Sepolia, Base Sepolia and Circle Arc Testnet
  CIRCLE_CCTP: [ChainId.ARBITRUM_SEPOLIA, ChainId.BASE_SEPOLIA, ChainId.CIRCLE_ARC_TESTNET],
  
  // LI.FI requirement: Testnets supporting cross-chain
  LI_FI: [ChainId.ARBITRUM_SEPOLIA, ChainId.BASE_SEPOLIA, ChainId.SEPOLIA, ChainId.CIRCLE_ARC_TESTNET],
  
  // ENS requirement: Sepolia testnet
  ENS: ChainId.SEPOLIA,
} as const

/**
 * Check if chain supports specific feature
 */
export function isChainSupportedForBounty(
  chainId: number,
  bounty: keyof typeof BOUNTY_SUPPORTED_CHAINS
): boolean {
  const supported = BOUNTY_SUPPORTED_CHAINS[bounty]
  
  if (Array.isArray(supported)) {
    return supported.includes(chainId)
  }
  
  return supported === chainId
}

/**
 * Get chains supporting specific bounty
 */
export function getChainsForBounty(bounty: keyof typeof BOUNTY_SUPPORTED_CHAINS): number[] {
  const supported = BOUNTY_SUPPORTED_CHAINS[bounty]
  
  if (Array.isArray(supported)) {
    return supported.map(id => Number(id)) // Explicitly convert to number array
  }
  
  return [Number(supported)]
}

// ==================== Chain Icons and Display Configuration ====================

/**
 * Chain icon configuration
 */
export const CHAIN_ICONS: Record<number, string> = {
  [ChainId.ETHEREUM]: '/icons/chains/ethereum.svg',
  [ChainId.ARBITRUM]: '/icons/chains/arbitrum.svg',
  [ChainId.ARBITRUM_SEPOLIA]: '/icons/chains/arbitrum.svg',
  [ChainId.BASE]: '/icons/chains/base.svg',
  [ChainId.BASE_SEPOLIA]: '/icons/chains/base.svg',
  [ChainId.OPTIMISM]: '/icons/chains/optimism.svg',
  [ChainId.POLYGON]: '/icons/chains/polygon.svg',
  [ChainId.AVALANCHE]: '/icons/chains/avalanche.svg',
  [ChainId.BSC]: '/icons/chains/bsc.svg',
  [ChainId.SEPOLIA]: '/icons/chains/ethereum.svg',
  [ChainId.CIRCLE_ARC_TESTNET]: '/icons/chains/circle.svg', // Assuming Circle icon exists
}

/**
 * Chain color configuration (for UI)
 */
export const CHAIN_COLORS: Record<number, string> = {
  [ChainId.ETHEREUM]: '#627EEA',
  [ChainId.ARBITRUM]: '#28A0F0',
  [ChainId.ARBITRUM_SEPOLIA]: '#28A0F0',
  [ChainId.BASE]: '#0052FF',
  [ChainId.BASE_SEPOLIA]: '#0052FF',
  [ChainId.OPTIMISM]: '#FF0420',
  [ChainId.POLYGON]: '#8247E5',
  [ChainId.AVALANCHE]: '#E84142',
  [ChainId.BSC]: '#F0B90B',
  [ChainId.SEPOLIA]: '#627EEA',
  [ChainId.CIRCLE_ARC_TESTNET]: '#1A4ED7', // Circle brand blue
}

/**
 * Get chain icon URL
 */
export function getChainIcon(chainId: number): string {
  return CHAIN_ICONS[chainId] || '/icons/chains/default.svg'
}

/**
 * Get chain color
 */
export function getChainColor(chainId: number): string {
  return CHAIN_COLORS[chainId] || '#666666'
}

/**
 * Format chain display information
 */
export function formatChainDisplay(chainId: number): {
  id: number
  name: string
  icon: string
  color: string
  isTestnet: boolean
} {
  const config = getChainConfig(chainId)
  
  return {
    id: chainId,
    name: config.name,
    icon: getChainIcon(chainId),
    color: getChainColor(chainId),
    isTestnet: config.testnet || false,
  }
}