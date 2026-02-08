import { createPublicClient, http, type Chain } from 'viem'
import { arbitrumSepolia, baseSepolia, mainnet, sepolia, arbitrum } from 'viem/chains'

// Environment variable configuration
const ARBITRUM_SEPOLIA_RPC = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc'
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'
const MAINNET_RPC = process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://eth-mainnet.g.alchemy.com/v2/demo'
const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://rpc.sepolia.org'
const ARBITRUM_SANDBOX_RPC = process.env.NEXT_PUBLIC_ARBITRUM_SANDBOX_RPC || 'https://rpc.buildbear.io/compatible-ironman-b68d3c41'

// BuildBear sandbox custom chain configuration (physical ID 31337)
const buildBearArbitrumSandbox: Chain = {
  ...arbitrum,
  id: 31337, // Physical ID must match node
  name: 'Arbitrum BuildBear Sandbox',
  nativeCurrency: arbitrum.nativeCurrency,
  rpcUrls: {
    default: {
      http: [ARBITRUM_SANDBOX_RPC],
    },
    public: {
      http: [ARBITRUM_SANDBOX_RPC],
    },
  },
}

// Chain configuration mapping
export const CHAIN_CONFIG: Record<number, { chain: Chain; rpc: string }> = {
  [arbitrumSepolia.id]: {
    chain: arbitrumSepolia,
    rpc: ARBITRUM_SEPOLIA_RPC,
  },
  [baseSepolia.id]: {
    chain: baseSepolia,
    rpc: BASE_SEPOLIA_RPC,
  },
  [mainnet.id]: {
    chain: mainnet,
    rpc: MAINNET_RPC,
  },
  [sepolia.id]: {
    chain: sepolia,
    rpc: SEPOLIA_RPC,
  },
  [arbitrum.id]: {
    chain: arbitrum,
    rpc: ARBITRUM_SANDBOX_RPC,
  },
  // Add BuildBear sandbox configuration (physical ID 31337)
  [31337]: {
    chain: buildBearArbitrumSandbox,
    rpc: ARBITRUM_SANDBOX_RPC,
  },
}

// Create public client
export function createChainClient(chainId: number) {
  const config = CHAIN_CONFIG[chainId]
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpc),
    // Disable viem internal validation to avoid chain ID verification issues
    batch: {
      multicall: false,
    },
    ccipRead: false,
  })
}

// Default client (Arbitrum Sepolia)
export const arbitrumSepoliaClient = createChainClient(arbitrumSepolia.id)

// Get all supported chains
export const SUPPORTED_CHAINS = Object.values(CHAIN_CONFIG).map((config) => config.chain)

// Wallet connection configuration
export const WALLET_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
  chains: SUPPORTED_CHAINS,
} as const

// Type exports
export type SupportedChainId = keyof typeof CHAIN_CONFIG