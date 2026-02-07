/**
 * Direct Intent Type Definitions
 * 
 * This file defines the core intent type system for the AI Intent Commander.
 * All user input natural language will be parsed into these structured intents.
 */

import { type Address } from 'viem'

// ==================== Basic Types ====================

/**
 * Supported intent type enumeration
 */
export enum IntentType {
  // Identity related
  RESOLVE_ENS = 'RESOLVE_ENS',           // Resolve ENS domain
  REVERSE_RESOLVE = 'REVERSE_RESOLVE',   // Reverse resolve address to domain
  
  // Transaction related
  SWAP = 'SWAP',                         // Token swap
  ADD_LIQUIDITY = 'ADD_LIQUIDITY',       // Add liquidity
  REMOVE_LIQUIDITY = 'REMOVE_LIQUIDITY', // Remove liquidity
  
  // Cross-chain related
  BRIDGE = 'BRIDGE',                     // Cross-chain asset transfer
  CCTP_TRANSFER = 'CCTP_TRANSFER',       // Circle CCTP cross-chain
  
  // Composite intents
  COMPLEX = 'COMPLEX',                   // Complex composite intent
}

/**
 * Token information
 */
export interface TokenInfo {
  address: Address
  symbol: string
  name: string
  decimals: number
  chainId: number
}

/**
 * Amount representation (supports string and BigInt)
 */
export type Amount = {
  raw: bigint                    // Raw BigInt value
  formatted: string             // Formatted string
  decimals: number              // Decimal places
}

// ==================== Intent Parameter Types ====================

/**
 * ENS resolution parameters
 */
export interface ResolveEnsParams {
  domain: string                // ENS domain (e.g., "vitalik.eth")
}

/**
 * Reverse resolution parameters
 */
export interface ReverseResolveParams {
  address: Address              // Address to reverse resolve
}

/**
 * Token swap parameters
 */
export interface SwapParams {
  fromToken: TokenInfo          // Source token
  toToken: TokenInfo            // Target token
  amountIn: Amount              // Input amount
  slippage: number              // Slippage tolerance (percentage)
  deadline?: number             // Transaction deadline (timestamp)
}

/**
 * Cross-chain bridge parameters
 */
export interface BridgeParams {
  fromChainId: number           // Source chain ID
  toChainId: number             // Target chain ID
  token: TokenInfo              // Token to bridge
  amount: Amount                // Amount
  recipient?: Address           // Recipient address (optional, defaults to current address)
}

/**
 * Circle CCTP cross-chain parameters
 */
export interface CctpTransferParams {
  fromChainId: number           // Source chain ID
  toChainId: number             // Target chain ID
  amount: Amount                // USDC amount
  recipient?: Address           // Recipient address
}

// ==================== Intent Result Types ====================

/**
 * Intent execution result status
 */
export enum IntentResultStatus {
  PENDING = 'PENDING',          // Waiting for execution
  EXECUTING = 'EXECUTING',      // Executing
  SUCCESS = 'SUCCESS',          // Success
  FAILED = 'FAILED',            // Failed
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS', // Partial success
}

/**
 * Intent execution result
 */
export interface IntentResult<T = any> {
  status: IntentResultStatus
  data?: T                      // Execution result data
  error?: string                // Error message
  transactionHash?: string      // Transaction hash (if any)
  timestamp: number             // Timestamp
  executionTime?: number        // Execution time (milliseconds)
}

// ==================== Core Intent Types ====================

/**
 * Nomad intent interface
 */
export interface NomadIntent {
  // Basic information
  id: string                    // Intent unique ID
  type: IntentType              // Intent type
  description: string           // Natural language description
  
  // Parameters
  params: 
    | ResolveEnsParams
    | ReverseResolveParams
    | SwapParams
    | BridgeParams
    | CctpTransferParams
    | Record<string, any>      // Other parameter types
  
  // Metadata
  chainId: number               // Target chain ID
  userAddress?: Address         // User address
  createdAt: number             // Creation timestamp
  
  // Execution status
  result?: IntentResult         // Execution result
  steps?: IntentStep[]          // Execution steps (for complex intents)
}

/**
 * Intent execution step
 */
export interface IntentStep {
  id: string                    // Step ID
  skill: string                 // Skill used (e.g., "ens", "lifi", "circle", "uniswap")
  description: string           // Step description
  params: Record<string, any>   // Step parameters
  dependsOn?: string[]          // Dependent step IDs
  result?: IntentResult         // Step execution result
}

// ==================== Utility Types ====================

/**
 * Type guard: check if it's an ENS resolution intent
 */
export function isResolveEnsIntent(intent: NomadIntent): intent is NomadIntent & { params: ResolveEnsParams } {
  return intent.type === IntentType.RESOLVE_ENS
}

/**
 * Type guard: check if it's a swap intent
 */
export function isSwapIntent(intent: NomadIntent): intent is NomadIntent & { params: SwapParams } {
  return intent.type === IntentType.SWAP
}

/**
 * Type guard: check if it's a bridge intent
 */
export function isBridgeIntent(intent: NomadIntent): intent is NomadIntent & { params: BridgeParams } {
  return intent.type === IntentType.BRIDGE
}

/**
 * Type guard: check if it's a CCTP cross-chain intent
 */
export function isCctpIntent(intent: NomadIntent): intent is NomadIntent & { params: CctpTransferParams } {
  return intent.type === IntentType.CCTP_TRANSFER
}

/**
 * Generate new intent ID
 */
export function generateIntentId(): string {
  return `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create amount object
 */
export function createAmount(raw: bigint, decimals: number): Amount {
  // Use BigInt constructor instead of literal
  const divisor = BigInt(10) ** BigInt(decimals)
  const integerPart = raw / divisor
  const fractionalPart = raw % divisor
  
  let formatted = integerPart.toString()
  if (fractionalPart > BigInt(0)) {
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
    // Remove trailing zeros
    formatted = `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '')
  }
  
  return {
    raw,
    formatted,
    decimals,
  }
}