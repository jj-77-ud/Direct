/**
 * Direct Contract Address Book
 * 
 * This file contains all smart contract addresses used by the project.
 * All addresses are read from environment variables or hardcoded configurations, ensuring security and maintainability.
 * 
 * Important: Never hardcode private keys or sensitive information in this file.
 */

import { ChainId } from './chains'

// ==================== Type Definitions ====================

/**
 * Contract address configuration interface
 */
export interface ContractAddresses {
  [chainId: number]: {
    [contractName: string]: `0x${string}`
  }
}

/**
 * Supported contract names
 */
export enum ContractName {
  // Uniswap v4
  UNISWAP_V4_POOL_MANAGER = 'UNISWAP_V4_POOL_MANAGER',
  UNISWAP_V4_STATE_VIEW = 'UNISWAP_V4_STATE_VIEW',
  
  // Circle CCTP
  CIRCLE_CCTP_MESSAGE_TRANSMITTER = 'CIRCLE_CCTP_MESSAGE_TRANSMITTER',
  CIRCLE_CCTP_TOKEN_MESSENGER = 'CIRCLE_CCTP_TOKEN_MESSENGER',
  
  // LI.FI
  LI_FI_EXECUTOR = 'LI_FI_EXECUTOR',
  
  // ENS
  ENS_REGISTRY = 'ENS_REGISTRY',
  ENS_PUBLIC_RESOLVER = 'ENS_PUBLIC_RESOLVER',
  
  // Common tokens
  USDC = 'USDC',
  WETH = 'WETH',
  DAI = 'DAI',
}

// ==================== Hardcoded Contract Addresses (Testnets) ====================

/**
 * Hardcoded contract address configuration
 * These addresses come from official documentation and configuration.md file
 */
const HARDCODED_ADDRESSES: ContractAddresses = {
  // Arbitrum Sepolia (testnet)
  [ChainId.ARBITRUM_SEPOLIA]: {
    // Uniswap v4 PoolManager - from user-provided new address
    [ContractName.UNISWAP_V4_POOL_MANAGER]: '0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317',
    // Uniswap v4 StateView - for efficient pool state queries
    [ContractName.UNISWAP_V4_STATE_VIEW]: '0x9d467fa9062B6e9B1a46e26007ad82db116c67CB',
    
    // Circle CCTP contracts - from configuration.md
    [ContractName.CIRCLE_CCTP_MESSAGE_TRANSMITTER]: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    [ContractName.CIRCLE_CCTP_TOKEN_MESSENGER]: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
    
    // LI.FI executor - from configuration.md
    [ContractName.LI_FI_EXECUTOR]: '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae',
    
    // ENS contracts (Sepolia testnet common)
    [ContractName.ENS_REGISTRY]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    [ContractName.ENS_PUBLIC_RESOLVER]: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
    
    // Common tokens (testnet) - from integration instructions
    [ContractName.USDC]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // New Arbitrum Sepolia USDC address
    [ContractName.WETH]: '0x980B62Da83eFf3D4576C647993b0C1D7faf17C73', // WETH new address
  },
  
  // Base Sepolia (testnet)
  [ChainId.BASE_SEPOLIA]: {
    // Circle CCTP contracts (same as Arbitrum Sepolia)
    [ContractName.CIRCLE_CCTP_MESSAGE_TRANSMITTER]: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    [ContractName.CIRCLE_CCTP_TOKEN_MESSENGER]: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
    
    // LI.FI executor
    [ContractName.LI_FI_EXECUTOR]: '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae',
    
    // ENS contracts
    [ContractName.ENS_REGISTRY]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    [ContractName.ENS_PUBLIC_RESOLVER]: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
    
    // Common tokens
    [ContractName.USDC]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    [ContractName.WETH]: '0x4200000000000000000000000000000000000006', // WETH
  },
  
  // Sepolia (testnet)
  [ChainId.SEPOLIA]: {
    // ENS contracts (mainnet addresses also work on testnet)
    [ContractName.ENS_REGISTRY]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    [ContractName.ENS_PUBLIC_RESOLVER]: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
    
    // Common tokens
    [ContractName.USDC]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    [ContractName.WETH]: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH
  },
  
  // Ethereum Mainnet
  [ChainId.ETHEREUM]: {
    // ENS contracts
    [ContractName.ENS_REGISTRY]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    [ContractName.ENS_PUBLIC_RESOLVER]: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
    
    // Common tokens
    [ContractName.USDC]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    [ContractName.WETH]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    [ContractName.DAI]: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  
  // Arbitrum Mainnet (BuildBear sandbox fork)
  [ChainId.ARBITRUM]: {
    // Common tokens - USDC address in BuildBear sandbox
    [ContractName.USDC]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum Native USDC
    [ContractName.WETH]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum WETH
    
    // LI.FI executor - using testnet address as placeholder
    [ContractName.LI_FI_EXECUTOR]: '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae',
    
    // ENS contracts (using mainnet addresses)
    [ContractName.ENS_REGISTRY]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    [ContractName.ENS_PUBLIC_RESOLVER]: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
  },
  
  // Circle Arc Testnet
  [ChainId.CIRCLE_ARC_TESTNET]: {
    // USDC token - Arc system-level native USDC address
    [ContractName.USDC]: '0x3600000000000000000000000000000000000000',
    
    // WETH token - assuming standard WETH address
    [ContractName.WETH]: '0x4200000000000000000000000000000000000006',
    
    // Note: Circle Arc Testnet may not have the following contracts, using placeholder addresses
    [ContractName.CIRCLE_CCTP_MESSAGE_TRANSMITTER]: '0x0000000000000000000000000000000000000000',
    [ContractName.CIRCLE_CCTP_TOKEN_MESSENGER]: '0x0000000000000000000000000000000000000000',
    [ContractName.LI_FI_EXECUTOR]: '0x0000000000000000000000000000000000000000',
    [ContractName.ENS_REGISTRY]: '0x0000000000000000000000000000000000000000',
    [ContractName.ENS_PUBLIC_RESOLVER]: '0x0000000000000000000000000000000000000000',
    [ContractName.UNISWAP_V4_POOL_MANAGER]: '0x0000000000000000000000000000000000000000',
  },
}

// ==================== Environment Variable Overrides ====================

/**
 * Get contract address from environment variables
 * Environment variables have higher priority than hardcoded addresses
 *
 * Note: On the client side, we can only access NEXT_PUBLIC_ prefixed environment variables
 * These variables are injected into window.ENV at build time
 */
function getAddressFromEnv(chainId: number, contractName: ContractName): `0x${string}` | null {
  // Build environment variable name
  const envVarName = `NEXT_PUBLIC_${contractName}_${chainId}`.toUpperCase()
  
  // Client-side environment variables (injected via Next.js publicRuntimeConfig)
  if (typeof window !== 'undefined') {
    // Try to read from global ENV object
    const globalEnv = (window as any).ENV || (window as any).__NEXT_DATA__?.env
    if (globalEnv?.[envVarName]) {
      const address = globalEnv[envVarName]
      if (isValidAddress(address)) {
        return address as `0x${string}`
      }
    }
    
    // Try to read from data-* attributes (fallback)
    const dataAttr = document.querySelector(`[data-${envVarName.toLowerCase()}]`)?.getAttribute(`data-${envVarName.toLowerCase()}`)
    if (dataAttr && isValidAddress(dataAttr)) {
      return dataAttr as `0x${string}`
    }
  }
  
  // Server-side environment variables (only available at build time)
  // Note: We don't directly use process.env, but rely on Next.js runtime configuration
  // This avoids client-side bundling issues
  
  return null
}

// ==================== Address Book Main Functions ====================

/**
 * Get contract address for specified chain and contract
 * 
 * @param chainId Chain ID
 * @param contractName Contract name
 * @returns Contract address, throws error if not found
 */
export function getContractAddress(
  chainId: number,
  contractName: ContractName
): `0x${string}` {
  // 1. First try environment variables
  const envAddress = getAddressFromEnv(chainId, contractName)
  if (envAddress) {
    return envAddress
  }
  
  // 2. Try hardcoded addresses
  const chainAddresses = HARDCODED_ADDRESSES[chainId]
  if (chainAddresses && chainAddresses[contractName]) {
    return chainAddresses[contractName]
  }
  
  // 3. If not found, throw error
  throw new Error(
    `Contract address not found for ${contractName} on chain ${chainId}. ` +
    `Please set environment variable NEXT_PUBLIC_${contractName}_${chainId} or add to addresses.ts`
  )
}

/**
 * Get all contract addresses for specified chain
 * 
 * @param chainId Chain ID
 * @returns All contract address mapping for the chain
 */
export function getAllContractAddresses(chainId: number): Record<string, `0x${string}`> {
  const result: Record<string, `0x${string}`> = {}
  const chainAddresses = HARDCODED_ADDRESSES[chainId] || {}
  
  // Add hardcoded addresses
  Object.entries(chainAddresses).forEach(([name, address]) => {
    result[name] = address
  })
  
  // Override with environment variable addresses
  Object.values(ContractName).forEach(contractName => {
    const envAddress = getAddressFromEnv(chainId, contractName)
    if (envAddress) {
      result[contractName] = envAddress
    }
  })
  
  return result
}

/**
 * Check if address is valid
 */
function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Format address for display
 */
export function formatAddress(address: `0x${string}`, truncate: boolean = true): string {
  if (!truncate) {
    return address
  }
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Address comparison (case-insensitive)
 */
export function areAddressesEqual(
  address1: `0x${string}` | string,
  address2: `0x${string}` | string
): boolean {
  return address1.toLowerCase() === address2.toLowerCase()
}

// ==================== Specific Contract Address Getter Functions ====================

/**
 * Get Uniswap v4 PoolManager address
 */
export function getUniswapV4PoolManagerAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.UNISWAP_V4_POOL_MANAGER)
}

/**
 * Get Uniswap v4 StateView address
 */
export function getUniswapV4StateViewAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.UNISWAP_V4_STATE_VIEW)
}

/**
 * Get Circle CCTP MessageTransmitter address
 */
export function getCircleCCTPMessageTransmitterAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.CIRCLE_CCTP_MESSAGE_TRANSMITTER)
}

/**
 * Get Circle CCTP TokenMessenger address
 */
export function getCircleCCTPTokenMessengerAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.CIRCLE_CCTP_TOKEN_MESSENGER)
}

/**
 * Get LI.FI executor address
 */
export function getLiFiExecutorAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.LI_FI_EXECUTOR)
}

/**
 * Get ENS Registry address
 */
export function getENSRegistryAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.ENS_REGISTRY)
}

/**
 * Get ENS Public Resolver address
 */
export function getENSPublicResolverAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.ENS_PUBLIC_RESOLVER)
}

/**
 * Get USDC token address
 */
export function getUSDCAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.USDC)
}

/**
 * Get WETH token address
 */
export function getWETHAddress(chainId: number): `0x${string}` {
  return getContractAddress(chainId, ContractName.WETH)
}

// ==================== Default Export ====================

/**
 * Default export: complete contract address configuration
 */
export default {
  getContractAddress,
  getAllContractAddresses,
  getUniswapV4PoolManagerAddress,
  getUniswapV4StateViewAddress,
  getCircleCCTPMessageTransmitterAddress,
  getCircleCCTPTokenMessengerAddress,
  getLiFiExecutorAddress,
  getENSRegistryAddress,
  getENSPublicResolverAddress,
  getUSDCAddress,
  getWETHAddress,
  formatAddress,
  areAddressesEqual,
  ContractName,
}