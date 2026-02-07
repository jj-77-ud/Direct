/**
 * Direct Blockchain Type Definitions
 *
 * This file defines types related to blockchain interactions, including transactions, contracts, events, etc.
 * Uses base types to avoid circular dependencies.
 */

import { type Address, type Hash, type TokenInfo, type BlockchainNetwork } from './base'

// ==================== Basic Types ====================

// Re-export base types
export type { Address, Hash, TokenInfo, BlockchainNetwork }

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
 * Token Balance Information
 */
export interface TokenBalance {
  token: TokenInfo             // Token information
  balance: bigint              // Raw balance
  formatted: string            // Formatted balance
  valueUSD?: string            // USD value (optional)
}

// ==================== Transaction Related Types ====================

/**
 * Transaction Status
 */
export enum TransactionStatus {
  PENDING = 'PENDING',         // Pending
  CONFIRMED = 'CONFIRMED',     // Confirmed
  FAILED = 'FAILED',           // Failed
  REVERTED = 'REVERTED',       // Reverted
  DROPPED = 'DROPPED',         // Dropped
}

/**
 * Transaction Type
 */
export enum TransactionType {
  TRANSFER = 'TRANSFER',       // Transfer
  SWAP = 'SWAP',               // Swap
  APPROVAL = 'APPROVAL',       // Approval
  BRIDGE = 'BRIDGE',           // Bridge
  CONTRACT_INTERACTION = 'CONTRACT_INTERACTION', // Contract interaction
  MULTICALL = 'MULTICALL',     // Multicall
}

/**
 * Transaction Request
 */
export interface TransactionRequest {
  from: Address                // Sender address
  to: Address                  // Recipient address (contract address)
  value?: bigint               // Amount of ETH to send
  data?: Hash                  // Transaction data
  gasLimit?: bigint            // Gas limit
  gasPrice?: bigint            // Gas price
  maxFeePerGas?: bigint        // Max fee per gas
  maxPriorityFeePerGas?: bigint // Max priority fee
  nonce?: number               // Nonce
  chainId: number              // Chain ID
}

/**
 * Transaction Response
 */
export interface TransactionResponse {
  hash: Hash                   // Transaction hash
  status: TransactionStatus    // Transaction status
  from: Address                // Sender
  to?: Address                 // Recipient
  value?: string               // Transfer amount
  gasUsed?: string             // Gas used
  gasPrice?: string            // Gas price
  blockNumber?: number         // Block number
  blockHash?: Hash             // Block hash
  timestamp?: number           // Timestamp
  confirmations: number        // Confirmations
  receipt?: TransactionReceipt // Transaction receipt
  error?: string               // Error message
}

/**
 * Transaction Receipt
 */
export interface TransactionReceipt {
  transactionHash: Hash        // Transaction hash
  transactionIndex: number     // Transaction index
  blockHash: Hash              // Block hash
  blockNumber: number          // Block number
  from: Address                // Sender
  to?: Address                 // Recipient
  cumulativeGasUsed: bigint    // Cumulative gas used
  gasUsed: bigint              // Actual gas used
  effectiveGasPrice: bigint    // Effective gas price
  contractAddress?: Address    // Contract address (if contract deployment)
  logs: Log[]                  // Logs
  logsBloom: string            // Logs bloom
  status: 'success' | 'reverted' // Status
  type: string                 // Transaction type
}

// ==================== Event and Log Types ====================

/**
 * Log Entry
 */
export interface Log {
  address: Address             // Contract address
  topics: Hash[]               // Topics
  data: Hash                   // Data
  blockNumber: number          // Block number
  transactionHash: Hash        // Transaction hash
  transactionIndex: number     // Transaction index
  blockHash: Hash              // Block hash
  logIndex: number             // Log index
  removed?: boolean            // Whether removed
}

/**
 * Event Filter
 */
export interface EventFilter {
  address?: Address            // Contract address
  topics?: (Hash | Hash[] | null)[] // Topic filter
  fromBlock?: bigint | 'latest' | 'earliest' | 'pending' // Start block
  toBlock?: bigint | 'latest' | 'earliest' | 'pending'   // End block
}

// ==================== Contract Related Types ====================

/**
 * Contract ABI Entry
 */
export interface ContractABIEntry {
  type: 'function' | 'event' | 'constructor' | 'fallback' | 'receive'
  name?: string               // Function/event name
  inputs?: Array<{
    name: string              // Parameter name
    type: string              // Parameter type
    internalType?: string     // Internal type
    components?: any[]        // Components (for structs)
  }>
  outputs?: Array<{
    name: string              // Output name
    type: string              // Output type
    internalType?: string     // Internal type
  }>
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable' // State mutability
  anonymous?: boolean         // Whether anonymous event
}

/**
 * Contract Information
 */
export interface ContractInfo {
  address: Address            // Contract address
  name: string                // Contract name
  abi: ContractABIEntry[]     // Contract ABI
  chainId: number             // Chain ID
  deployedBlock: number       // Deployment block
  verified: boolean           // Whether verified
  sourceCode?: string         // Source code (if verified)
}

/**
 * Contract Call Options
 */
export interface ContractCallOptions {
  from?: Address              // Caller address
  value?: bigint              // ETH to send
  gasLimit?: bigint           // Gas limit
  gasPrice?: bigint           // Gas price
  blockTag?: 'latest' | 'earliest' | 'pending' | bigint // Block tag
}

// ==================== Cross-Chain Related Types ====================

/**
 * Cross-Chain Bridge Route
 */
export interface BridgeRoute {
  id: string                  // Route ID
  fromChain: number           // Source chain ID
  toChain: number             // Destination chain ID
  fromToken: TokenInfo        // Source token
  toToken: TokenInfo          // Destination token
  bridgeProvider: string      // Bridge provider (e.g., LI.FI, Circle CCTP)
  
  // Fee information
  feeAmount: string           // Fee amount
  feePercentage: number       // Fee percentage
  estimatedTime: number       // Estimated time (seconds)
  
  // Transaction information
  steps: BridgeStep[]         // Bridge steps
  transactionRequest?: TransactionRequest // Transaction request
}

/**
 * Bridge Step
 */
export interface BridgeStep {
  type: 'swap' | 'bridge' | 'approval' | 'deposit' | 'withdraw' // Step type
  description: string         // Step description
  chainId: number             // Chain ID
  tool: string                // Tool used
  estimate: {
    gas: string               // Estimated gas
    time: number              // Estimated time (seconds)
    cost: string              // Estimated cost
  }
}

/**
 * Cross-Chain Quote
 */
export interface CrossChainQuote {
  routes: BridgeRoute[]       // Available routes
  bestRoute: BridgeRoute      // Best route
  timestamp: number           // Quote timestamp
  validity: number            // Validity period (seconds)
}

// ==================== Utility Types ====================

/**
 * Create Token Information (compatibility function)
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
 * Format Gas Price
 */
export function formatGasPrice(wei: bigint): string {
  const gwei = wei / BigInt(1e9)
  return `${gwei.toString()} Gwei`
}

/**
 * Estimate Transaction Cost
 */
export function estimateTransactionCost(
  gasLimit: bigint,
  gasPrice: bigint,
  nativeTokenPriceUSD?: number
): {
  wei: bigint
  gwei: string
  eth: string
  usd?: string
} {
  const wei = gasLimit * gasPrice
  const gwei = wei / BigInt(1e9)
  const eth = Number(gwei) / 1e9
  
  const result: any = {
    wei,
    gwei: gwei.toString(),
    eth: eth.toFixed(9),
  }
  
  if (nativeTokenPriceUSD) {
    result.usd = `$${(eth * nativeTokenPriceUSD).toFixed(2)}`
  }
  
  return result
}

/**
 * Validate Address Format
 */
export function isValidAddress(address: string): boolean {
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