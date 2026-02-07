/**
 * LI.FI SDK Initialization Configuration
 * 
 * Initialize based on API keys and configuration provided in the documentation
 */

import { createConfig, ChainId as LiFiChainId } from '@lifi/sdk'
import { ChainId } from '@/constants/chains'

/**
 * Initialize LI.FI SDK configuration
 *
 * Note: This function should be called once when the application starts
 */
export function initLifiSDK() {
  try {
    // Get RPC URLs from environment variables, using project-configured ChainId
    const arbitrumSepoliaRpc = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc'
    const baseSepoliaRpc = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'
    const sepoliaRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://rpc.sepolia.org'
    
    // LI.FI SDK uses its own ChainId constants, mapping required
    // Note: LI.FI SDK ChainId may differ from project ChainId
    // Using numeric ChainId here for compatibility
    const rpcUrls: Record<number, string[]> = {
      // Mainnet configuration - using LI.FI SDK ChainId constants
      [LiFiChainId.ETH]: ['https://eth-mainnet.g.allthatnode.com'],
      [LiFiChainId.ARB]: ['https://arb1.arbitrum.io/rpc'],
      [LiFiChainId.BSC]: ['https://bsc-dataseed.binance.org/'],
      [LiFiChainId.POL]: ['https://polygon-rpc.com'],
      [LiFiChainId.AVA]: ['https://api.avax.network/ext/bc/C/rpc'],
      // Optimism and Base mainnet - using numeric ChainId
      10: ['https://mainnet.optimism.io'], // Optimism mainnet
      8453: ['https://mainnet.base.org'], // Base mainnet
      
      // Testnet configuration - using project ChainId numeric values
      // Arbitrum Sepolia: 421614
      [ChainId.ARBITRUM_SEPOLIA]: [arbitrumSepoliaRpc],
      // Base Sepolia: 84532
      [ChainId.BASE_SEPOLIA]: [baseSepoliaRpc],
      // Sepolia: 11155111
      [ChainId.SEPOLIA]: [sepoliaRpc],
    }
    
    createConfig({
      // Required: Integrator identifier
      integrator: 'Nomad-Arc',
      
      // Required: Your exclusive API Key for rate limit improvement
      apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY || '01324a3d-4773-4746-b0c7-a58c257478e9.f744cb62-ae84-4985-a685-58c4e85ed6d2',
      
      // Recommended: Custom RPC node configuration to prevent public node failures
      rpcUrls: rpcUrls as any,
      
      // Global route preferences
      routeOptions: {
        slippage: 0.005,        // Default slippage 0.5%
        allowSwitchChain: true, // Allow automatic network switching during transactions
      },
      
      // Auto-preload chain data
      preloadChains: true,
      
      // Debug mode
      debug: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    })
    
    console.log('LI.FI SDK configuration initialized successfully', {
      hasApiKey: !!process.env.NEXT_PUBLIC_LIFI_API_KEY,
      testnetRpcConfigured: {
        arbitrumSepolia: !!arbitrumSepoliaRpc,
        baseSepolia: !!baseSepoliaRpc,
        sepolia: !!sepoliaRpc,
      },
      rpcUrlsCount: Object.keys(rpcUrls).length,
    })
    return true
  } catch (error) {
    console.error('LI.FI SDK configuration initialization failed:', error)
    return false
  }
}

/**
 * Get LI.FI SDK configuration status
 */
export function getLifiConfigStatus() {
  return {
    hasApiKey: !!process.env.NEXT_PUBLIC_LIFI_API_KEY,
    apiKeyLength: process.env.NEXT_PUBLIC_LIFI_API_KEY?.length || 0,
    integrator: 'Nomad-Arc',
    initialized: true,
  }
}

// Export LI.FI SDK common functions
export { getRoutes, getStatus, executeRoute, type RoutesRequest, type Route, type StatusResponse } from '@lifi/sdk'