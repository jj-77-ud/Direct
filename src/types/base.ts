/**
 * Direct Base Type Definitions
 * 
 * This file defines base types that do not depend on external packages, used to avoid circular dependencies.
 * These types remain available even when external packages (like viem) are not installed.
 */

// ==================== Basic Types ====================

/**
 * Ethereum Address Type (0x-prefixed, 40 hexadecimal characters)
 */
export type Address = `0x${string}`

/**
 * Transaction Hash Type (0x-prefixed, 64 hexadecimal characters)
 */
export type Hash = `0x${string}`

/**
 * Token Standard
 */
export enum TokenStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  NATIVE = 'NATIVE',
}

/**
 * Token Information
 */
export interface TokenInfo {
  address: Address
  symbol: string
  name: string
  decimals: number
  chainId: number
  standard?: TokenStandard
  logoURI?: string
}

/**
 * Blockchain Network Configuration
 */
export interface BlockchainNetwork {
  id: number
  name: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls: {
    default: { http: string[] }
    public?: { http: string[] }
  }
  blockExplorers?: {
    default: {
      name: string
      url: string
    }
  }
  testnet?: boolean
}

// ==================== Utility Functions ====================

/**
 * Validate Address Format
 */
export function isValidAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Shorten Address Display
 */
export function shortenAddress(address: Address, chars = 4): string {
  if (!address) return ''
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`
}

/**
 * Check if Two Addresses are Equal (case-insensitive)
 */
export function areAddressesEqual(a: Address, b: Address): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Create Token Information
 */
export function createTokenInfo(
  address: Address,
  symbol: string,
  name: string,
  decimals: number,
  chainId: number,
  standard: TokenStandard = TokenStandard.ERC20
): TokenInfo {
  return {
    address,
    symbol,
    name,
    decimals,
    chainId,
    standard,
  }
}

/**
 * Type Guard: Check if Valid Address
 */
export function assertValidAddress(address: string): asserts address is Address {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: ${address}`)
  }
}

/**
 * Safely Convert String to Address Type
 */
export function toAddress(address: string): Address {
  assertValidAddress(address)
  return address
}

/**
 * Zero Address Constant
 */
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

/**
 * Zero Hash Constant
 */
export const ZERO_HASH: Hash = '0x0000000000000000000000000000000000000000000000000000000000000000'