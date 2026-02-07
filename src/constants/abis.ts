/**
 * Smart Contract ABI Definitions
 * 
 * This file contains all smart contract ABIs required by the project.
 * Note: Uniswap v4 ABIs are imported from @uniswap/v4-sdk to avoid duplicate definitions.
 */

import { V4_BASE_ACTIONS_ABI_DEFINITION, V4_SWAP_ACTIONS_V2_1 } from '@uniswap/v4-sdk'

// ==================== Uniswap v4 ABIs ====================

/**
 * Uniswap v4 Base Actions ABI
 */
export const UNISWAP_V4_BASE_ACTIONS_ABI = V4_BASE_ACTIONS_ABI_DEFINITION

/**
 * Uniswap v4 Swap Actions ABI (V2.1)
 */
export const UNISWAP_V4_SWAP_ACTIONS_ABI = V4_SWAP_ACTIONS_V2_1

/**
 * Uniswap v4 PoolManager ABI (simplified)
 * Note: Full PoolManager ABI can be obtained from Uniswap official repository
 * Here we provide key function definitions for interaction
 */
export const UNISWAP_V4_POOL_MANAGER_ABI = [
  {
    name: 'initialize',
    type: 'function',
    inputs: [
      { name: 'key', type: 'tuple', components: [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' },
      ]},
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'swap',
    type: 'function',
    inputs: [
      { name: 'key', type: 'tuple', components: [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' },
      ]},
      { name: 'params', type: 'tuple', components: [
        { name: 'zeroForOne', type: 'bool' },
        { name: 'amountSpecified', type: 'int256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ]},
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [
      { name: 'amount0', type: 'int256' },
      { name: 'amount1', type: 'int256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    name: 'modifyLiquidity',
    type: 'function',
    inputs: [
      { name: 'key', type: 'tuple', components: [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' },
      ]},
      { name: 'params', type: 'tuple', components: [
        { name: 'tickLower', type: 'int24' },
        { name: 'tickUpper', type: 'int24' },
        { name: 'liquidityDelta', type: 'int128' },
        { name: 'hookData', type: 'bytes' },
      ]},
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [
      { name: 'amount0', type: 'int256' },
      { name: 'amount1', type: 'int256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    name: 'getSlot0',
    type: 'function',
    inputs: [
      { name: 'id', type: 'bytes32' },
    ],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFees', type: 'uint8' },
      { name: 'hookFees', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'liquidity',
    type: 'function',
    inputs: [
      { name: 'id', type: 'bytes32' },
    ],
    outputs: [
      { name: 'liquidity', type: 'uint128' },
    ],
    stateMutability: 'view',
  },
] as const

/**
 * Uniswap v4 StateView ABI - for efficient pool state queries
 * From integration instructions provided ABI snippet
 */
export const UNISWAP_V4_STATE_VIEW_ABI = [
  {
    name: 'getSlot0',
    type: 'function',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint16' },
      { name: 'lpFee', type: 'uint24' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'getLiquidity',
    type: 'function',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'liquidity', type: 'uint128' },
    ],
    stateMutability: 'view',
  },
] as const

// ==================== Circle CCTP ABIs ====================

/**
 * Circle CCTP MessageTransmitter ABI (simplified)
 */
export const CIRCLE_MESSAGE_TRANSMITTER_ABI = [
  {
    name: 'receiveMessage',
    type: 'function',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'sendMessage',
    type: 'function',
    inputs: [
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'recipient', type: 'bytes32' },
      { name: 'messageBody', type: 'bytes' },
    ],
    outputs: [
      { name: 'message', type: 'bytes' },
    ],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * Circle CCTP TokenMessenger ABI (simplified)
 */
export const CIRCLE_TOKEN_MESSENGER_ABI = [
  {
    name: 'depositForBurn',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
    ],
    outputs: [
      { name: 'nonce', type: 'uint64' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    name: 'replaceDepositForBurn',
    type: 'function',
    inputs: [
      { name: 'originalMessage', type: 'bytes' },
      { name: 'originalAttestation', type: 'bytes' },
      { name: 'newDestinationCaller', type: 'bytes32' },
      { name: 'newMintRecipient', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

// ==================== LI.FI Executor ABI ====================

/**
 * LI.FI Diamond Executor ABI (simplified)
 */
export const LIFI_EXECUTOR_ABI = [
  {
    name: 'execute',
    type: 'function',
    inputs: [
      { name: 'transactionId', type: 'bytes32' },
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    name: 'startBridgeTokensViaLiFi',
    type: 'function',
    inputs: [
      { name: 'bridgeData', type: 'tuple', components: [
        { name: 'transactionId', type: 'bytes32' },
        { name: 'bridge', type: 'string' },
        { name: 'integrator', type: 'string' },
        { name: 'referrer', type: 'address' },
        { name: 'sendingAssetId', type: 'address' },
        { name: 'receiver', type: 'address' },
        { name: 'minAmount', type: 'uint256' },
        { name: 'destinationChainId', type: 'uint256' },
        { name: 'hasSourceSwaps', type: 'bool' },
        { name: 'hasDestinationSwaps', type: 'bool' },
      ]},
      { name: 'swapData', type: 'tuple', components: [
        { name: 'callTo', type: 'address' },
        { name: 'approveTo', type: 'address' },
        { name: 'sendingAssetId', type: 'address' },
        { name: 'receivingAssetId', type: 'address' },
        { name: 'fromAmount', type: 'uint256' },
        { name: 'callData', type: 'bytes' },
        { name: 'requiresDeposit', type: 'bool' },
      ]},
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const

// ==================== ERC20 Standard ABI ====================

/**
 * ERC20 Standard ABI (simplified)
 */
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [
      { name: 'account', type: 'address' },
    ],
    outputs: [
      { name: 'balance', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { name: 'success', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { name: 'success', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [
      { name: 'remaining', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'decimals', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'symbol', type: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'name', type: 'string' },
    ],
    stateMutability: 'view',
  },
] as const

// ==================== Type Exports ====================

export type UniswapV4PoolManagerABI = typeof UNISWAP_V4_POOL_MANAGER_ABI
export type CircleMessageTransmitterABI = typeof CIRCLE_MESSAGE_TRANSMITTER_ABI
export type CircleTokenMessengerABI = typeof CIRCLE_TOKEN_MESSENGER_ABI
export type LiFiExecutorABI = typeof LIFI_EXECUTOR_ABI
export type ERC20ABI = typeof ERC20_ABI