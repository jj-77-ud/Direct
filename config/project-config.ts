/**
 * Nomad Arc Project Unified Configuration File
 * 
 * Integrates all sponsor SDK configurations, blockchain configurations, and contract addresses
 * This file replaces scattered configuration documents
 */

// ==================== Chain Configuration ====================
export const CHAIN_CONFIG = {
  // Testnet configurations
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
  },
  
  BASE_SEPOLIA: {
    chainId: 84532,
    name: 'Base Sepolia',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
  
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  
  // Mainnet configurations
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    blockExplorer: 'https://etherscan.io',
  },
  
  ARBITRUM: {
    chainId: 42161,
    name: 'Arbitrum One',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
  },
  
  BASE: {
    chainId: 8453,
    name: 'Base',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
} as const;

// ==================== Sponsor SDK Configuration ====================
export const SDK_CONFIG = {
  // Circle Arc SDK
  CIRCLE: {
    packageName: '@aboutcircles/sdk',
    version: '0.1.5',
    installCommand: 'npm install @aboutcircles/sdk',
    docsUrl: 'https://developers.circle.com',
  },
  
  // LI.FI SDK
  LIFI: {
    packageName: '@lifi/sdk',
    version: '3.15.0',
    installCommand: 'npm install @lifi/sdk',
    docsUrl: 'https://docs.li.fi',
    apiKey: '01324a3d-4773-4746-b0c7-a58c257478e9.f744cb62-ae84-4985-a685-58c4e85ed6d2',
    integrator: 'Nomad-Arc',
  },
  
  // Uniswap v4 SDK
  UNISWAP: {
    packageName: '@uniswap/v4-sdk',
    version: '1.27.0',
    installCommand: 'npm install @uniswap/v4-sdk @uniswap/sdk-core',
    docsUrl: 'https://docs.uniswap.org',
  },
  
  // ENSjs
  ENS: {
    packageName: '@ensdomains/ensjs',
    version: '4.2.0',
    installCommand: 'npm install @ensdomains/ensjs',
    docsUrl: 'https://docs.ens.domains',
  },
} as const;

// ==================== Contract Address Configuration ====================
export const CONTRACT_ADDRESSES = {
  // Arbitrum Sepolia Testnet
  ARBITRUM_SEPOLIA: {
    // Uniswap v4
    UNISWAP_V4_POOL_MANAGER: '0x6736678280587003019D123eBE3974bb21d60768' as const,
    
    // Circle CCTP
    CIRCLE_MESSAGE_TRANSMITTER: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' as const,
    CIRCLE_TOKEN_MESSENGER: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' as const,
    
    // LI.FI
    LIFI_EXECUTOR: '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae' as const,
    
    // Token addresses
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const,
    WETH: '0xEe01c0CD76354C383B8c7B4e65EA88D00B06f36f' as const,
  },
  
  // Base Sepolia Testnet
  BASE_SEPOLIA: {
    // Circle CCTP (same as Arbitrum Sepolia)
    CIRCLE_MESSAGE_TRANSMITTER: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' as const,
    CIRCLE_TOKEN_MESSENGER: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' as const,
    
    // Token addresses
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
    WETH: '0x4200000000000000000000000000000000000006' as const,
  },
} as const;

// ==================== Circle CCTP Specific Configuration ====================
export const CIRCLE_CCTP_CONFIG = {
  // Message Transmitter: responsible for receiving and sending cross-chain messages
  messageTransmitter: CONTRACT_ADDRESSES.ARBITRUM_SEPOLIA.CIRCLE_MESSAGE_TRANSMITTER,
  
  // Token Messenger: responsible for burning and minting USDC
  tokenMessenger: CONTRACT_ADDRESSES.ARBITRUM_SEPOLIA.CIRCLE_TOKEN_MESSENGER,
  
  // Target chain Domain ID reference (Sepolia testnet)
  domains: {
    arbitrum: 3,
    base: 6,
    ethereum: 0,
  },
  
  // Circle API endpoint
  irisApi: 'https://iris-api-sandbox.circle.com',
} as const;

// ==================== Uniswap v4 Specific Configuration ====================
export const UNISWAP_V4_CONFIG = {
  chainId: CHAIN_CONFIG.ARBITRUM_SEPOLIA.chainId,
  poolManager: CONTRACT_ADDRESSES.ARBITRUM_SEPOLIA.UNISWAP_V4_POOL_MANAGER,
  // Note: v4 operations typically require reading state through StateView contract
} as const;

// ==================== LI.FI SDK Initialization Configuration ====================
export const LIFI_SDK_CONFIG = {
  // Required: integrator identifier
  integrator: SDK_CONFIG.LIFI.integrator,
  
  // Required: API Key for rate limit enhancement
  apiKey: SDK_CONFIG.LIFI.apiKey,
  
  // Recommended: custom RPC node configuration to prevent public node failures
  rpcUrls: {
    [CHAIN_CONFIG.ETHEREUM.chainId]: ['https://eth-mainnet.g.allthatnode.com'],
    [CHAIN_CONFIG.ARBITRUM.chainId]: ['https://arb1.arbitrum.io/rpc'],
    [CHAIN_CONFIG.BASE.chainId]: ['https://mainnet.base.org'],
  },
  
  // Global routing preferences
  routeOptions: {
    slippage: 0.005,        // Default slippage 0.5%
    allowSwitchChain: true, // Allow automatic network switching during transactions
  },
  
  // Automatically preload chain data
  preloadChains: true,
} as const;

// ==================== Environment Variable Keys ====================
export const ENV_KEYS = {
  // DeepSeek API
  DEEPSEEK_API_KEY: 'DEEPSEEK_API_KEY',
  
  // Blockchain RPC
  ARBITRUM_SEPOLIA_RPC: 'NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC',
  BASE_SEPOLIA_RPC: 'NEXT_PUBLIC_BASE_SEPOLIA_RPC',
  MAINNET_RPC: 'NEXT_PUBLIC_MAINNET_RPC',
  SEPOLIA_RPC: 'NEXT_PUBLIC_SEPOLIA_RPC',
  
  // Node service API
  ALCHEMY_API_KEY: 'NEXT_PUBLIC_ALCHEMY_API_KEY',
  INFURA_API_KEY: 'NEXT_PUBLIC_INFURA_API_KEY',
  
  // Wallet connection
  WALLET_CONNECT_PROJECT_ID: 'NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID',
  
  // LI.FI API
  LIFI_API_KEY: 'NEXT_PUBLIC_LIFI_API_KEY',
  
  // Debug mode
  DEBUG_MODE: 'NEXT_PUBLIC_DEBUG_MODE',
} as const;

// ==================== Utility Functions ====================
export function getChainConfig(chainId: number) {
  const chain = Object.values(CHAIN_CONFIG).find(c => c.chainId === chainId);
  if (!chain) {
    throw new Error(`Chain with ID ${chainId} not found in configuration`);
  }
  return chain;
}

export function getContractAddress(
  chainId: number,
  contractType: keyof typeof CONTRACT_ADDRESSES.ARBITRUM_SEPOLIA | keyof typeof CONTRACT_ADDRESSES.BASE_SEPOLIA
) {
  if (chainId === CHAIN_CONFIG.ARBITRUM_SEPOLIA.chainId) {
    const addresses = CONTRACT_ADDRESSES.ARBITRUM_SEPOLIA as any;
    return addresses[contractType];
  } else if (chainId === CHAIN_CONFIG.BASE_SEPOLIA.chainId) {
    const addresses = CONTRACT_ADDRESSES.BASE_SEPOLIA as any;
    return addresses[contractType];
  }
  throw new Error(`Contract addresses not configured for chain ${chainId}`);
}

// ==================== Default Export ====================
export default {
  chains: CHAIN_CONFIG,
  sdks: SDK_CONFIG,
  contracts: CONTRACT_ADDRESSES,
  circleCctp: CIRCLE_CCTP_CONFIG,
  uniswapV4: UNISWAP_V4_CONFIG,
  lifi: LIFI_SDK_CONFIG,
  env: ENV_KEYS,
  utils: {
    getChainConfig,
    getContractAddress,
  },
};