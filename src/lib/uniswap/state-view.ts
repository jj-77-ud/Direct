/**
 * Uniswap v4 StateView Query Tool
 * 
 * Provides functions to read pool state from StateView contract
 * Supports fetching slot0 (sqrtPriceX96, tick, protocolFee, lpFee) and liquidity data
 */

import { createChainClient } from '@/lib/blockchain/providers'
import { getUniswapV4StateViewAddress } from '@/constants/addresses'
import { UNISWAP_V4_STATE_VIEW_ABI } from '@/constants/abis'
import { type Address, type Hash, getAddress } from 'viem'

/**
 * Pool state interface
 */
export interface PoolState {
  sqrtPriceX96: bigint
  tick: number
  protocolFee: number
  lpFee: number
  liquidity: bigint
}

/**
 * Get pool state
 * @param chainId Chain ID
 * @param poolId Pool ID (bytes32)
 * @returns Pool state object
 */
export async function getPoolState(
  chainId: number,
  poolId: Hash
): Promise<PoolState> {
  try {
    const publicClient = createChainClient(chainId)
    const stateViewAddress = getAddress(getUniswapV4StateViewAddress(chainId))
    
    console.log(`🔍 Querying pool state: chainId=${chainId}, poolId=${poolId}`)
    console.log(`📋 StateView address: ${stateViewAddress}`)
    
    // Parallel queries for slot0 and liquidity
    const [slot0Result, liquidityResult] = await Promise.all([
      publicClient.readContract({
        address: stateViewAddress,
        abi: UNISWAP_V4_STATE_VIEW_ABI,
        functionName: 'getSlot0',
        args: [poolId],
      }),
      publicClient.readContract({
        address: stateViewAddress,
        abi: UNISWAP_V4_STATE_VIEW_ABI,
        functionName: 'getLiquidity',
        args: [poolId],
      }),
    ])
    
    const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0Result
    const liquidity = liquidityResult
    
    const poolState: PoolState = {
      sqrtPriceX96,
      tick,
      protocolFee,
      lpFee,
      liquidity,
    }
    
    console.log(`✅ Pool state query successful:`, {
      sqrtPriceX96: sqrtPriceX96.toString(),
      tick,
      protocolFee,
      lpFee,
      liquidity: liquidity.toString(),
    })
    
    return poolState
    
  } catch (error) {
    console.error('❌ Pool state query failed:', error)
    throw new Error(`Unable to query pool state: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Calculate price (based on sqrtPriceX96)
 * @param sqrtPriceX96 sqrtPriceX96 value
 * @returns Price (token1/token0)
 */
export function calculatePriceFromSqrtPriceX96(sqrtPriceX96: bigint): number {
  // If sqrtPriceX96 is 0, return 0 price
  if (sqrtPriceX96 === 0n) {
    return 0
  }
  
  // Price = (sqrtPriceX96 / 2^96)^2
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96
  const price = sqrtPrice * sqrtPrice
  
  // Prevent extremely small values due to floating point precision
  return price < 1e-18 ? 0 : price
}

/**
 * Calculate slippage-limited sqrtPriceX96
 * @param sqrtPriceX96 Current sqrtPriceX96
 * @param slippagePercent Slippage percentage (e.g., 0.5 means 0.5%)
 * @param isExactInput Whether it's exact input (true: tokenIn fixed, false: tokenOut fixed)
 * @returns Slippage-limited sqrtPriceX96
 */
export function calculateSqrtPriceLimitX96(
  sqrtPriceX96: bigint,
  slippagePercent: number,
  isExactInput: boolean
): bigint {
  const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96)
  const slippageFactor = slippagePercent / 100
  
  let limitPrice: number
  if (isExactInput) {
    // Exact input: price cannot be lower than current price * (1 - slippage)
    limitPrice = price * (1 - slippageFactor)
  } else {
    // Exact output: price cannot be higher than current price * (1 + slippage)
    limitPrice = price * (1 + slippageFactor)
  }
  
  // Calculate limit sqrtPriceX96 = sqrt(limitPrice) * 2^96
  const limitSqrtPrice = Math.sqrt(limitPrice)
  const limitSqrtPriceX96 = BigInt(Math.floor(limitSqrtPrice * 2 ** 96))
  
  return limitSqrtPriceX96
}

/**
 * Calculate price impact
 * @param sqrtPriceX96Before sqrtPriceX96 before transaction
 * @param sqrtPriceX96After sqrtPriceX96 after transaction
 * @returns Price impact percentage
 */
export function calculatePriceImpact(
  sqrtPriceX96Before: bigint,
  sqrtPriceX96After: bigint
): number {
  const priceBefore = calculatePriceFromSqrtPriceX96(sqrtPriceX96Before)
  const priceAfter = calculatePriceFromSqrtPriceX96(sqrtPriceX96After)
  
  if (priceBefore === 0) return 0
  
  const impact = ((priceAfter - priceBefore) / priceBefore) * 100
  return impact
}

/**
 * Generate pool ID (based on PoolKey)
 * Note: This function uses @uniswap/v4-sdk's getPoolId function
 * Here we provide a simplified version for testing
 */
export function generatePoolId(
  token0: Address,
  token1: Address,
  fee: number,
  tickSpacing: number,
  hooks: Address = '0x0000000000000000000000000000000000000000'
): Hash {
  // In actual implementation, should use @uniswap/v4-sdk's getPoolId function
  // Here we return a mock pool ID for testing
  console.warn('⚠️  Using mock pool ID generation function, actual implementation should use @uniswap/v4-sdk')
  
  // Simple hash simulation (actual should use keccak256(abi.encode(PoolKey)))
  const poolKeyString = `${token0}-${token1}-${fee}-${tickSpacing}-${hooks}`
  // Return a mock bytes32 value
  return `0x${Buffer.from(poolKeyString).toString('hex').padEnd(64, '0')}` as Hash
}