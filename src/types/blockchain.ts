/**
 * Nomad Arc 区块链类型定义
 *
 * 此文件定义了与区块链交互相关的类型，包括交易、合约、事件等。
 * 使用基础类型以避免循环依赖。
 */

import { type Address, type Hash, type TokenInfo, type BlockchainNetwork } from './base'

// ==================== 基础类型 ====================

// 重新导出基础类型
export type { Address, Hash, TokenInfo, BlockchainNetwork }

/**
 * 代币标准
 */
export enum TokenStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  NATIVE = 'NATIVE',
}

/**
 * 代币余额信息
 */
export interface TokenBalance {
  token: TokenInfo             // 代币信息
  balance: bigint              // 原始余额
  formatted: string            // 格式化后的余额
  valueUSD?: string            // 美元价值（可选）
}

// ==================== 交易相关类型 ====================

/**
 * 交易状态
 */
export enum TransactionStatus {
  PENDING = 'PENDING',         // 等待中
  CONFIRMED = 'CONFIRMED',     // 已确认
  FAILED = 'FAILED',           // 失败
  REVERTED = 'REVERTED',       // 回滚
  DROPPED = 'DROPPED',         // 被丢弃
}

/**
 * 交易类型
 */
export enum TransactionType {
  TRANSFER = 'TRANSFER',       // 转账
  SWAP = 'SWAP',               // 兑换
  APPROVAL = 'APPROVAL',       // 授权
  BRIDGE = 'BRIDGE',           // 跨链
  CONTRACT_INTERACTION = 'CONTRACT_INTERACTION', // 合约交互
  MULTICALL = 'MULTICALL',     // 多调用
}

/**
 * 交易请求
 */
export interface TransactionRequest {
  from: Address                // 发送方地址
  to: Address                  // 接收方地址（合约地址）
  value?: bigint               // 发送的 ETH 数量
  data?: Hash                  // 交易数据
  gasLimit?: bigint            // gas 限制
  gasPrice?: bigint            // gas 价格
  maxFeePerGas?: bigint        // 最大每 gas 费用
  maxPriorityFeePerGas?: bigint // 最大优先费用
  nonce?: number               // nonce
  chainId: number              // 链 ID
}

/**
 * 交易响应
 */
export interface TransactionResponse {
  hash: Hash                   // 交易哈希
  status: TransactionStatus    // 交易状态
  from: Address                // 发送方
  to?: Address                 // 接收方
  value?: string               // 转账金额
  gasUsed?: string             // 使用的 gas
  gasPrice?: string            // gas 价格
  blockNumber?: number         // 区块号
  blockHash?: Hash             // 区块哈希
  timestamp?: number           // 时间戳
  confirmations: number        // 确认数
  receipt?: TransactionReceipt // 交易收据
  error?: string               // 错误信息
}

/**
 * 交易收据
 */
export interface TransactionReceipt {
  transactionHash: Hash        // 交易哈希
  transactionIndex: number     // 交易索引
  blockHash: Hash              // 区块哈希
  blockNumber: number          // 区块号
  from: Address                // 发送方
  to?: Address                 // 接收方
  cumulativeGasUsed: bigint    // 累计使用的 gas
  gasUsed: bigint              // 实际使用的 gas
  effectiveGasPrice: bigint    // 有效的 gas 价格
  contractAddress?: Address    // 合约地址（如果是部署合约）
  logs: Log[]                  // 日志
  logsBloom: string            // logs bloom
  status: 'success' | 'reverted' // 状态
  type: string                 // 交易类型
}

// ==================== 事件和日志类型 ====================

/**
 * 日志条目
 */
export interface Log {
  address: Address             // 合约地址
  topics: Hash[]               // 主题
  data: Hash                   // 数据
  blockNumber: number          // 区块号
  transactionHash: Hash        // 交易哈希
  transactionIndex: number     // 交易索引
  blockHash: Hash              // 区块哈希
  logIndex: number             // 日志索引
  removed?: boolean            // 是否被移除
}

/**
 * 事件过滤器
 */
export interface EventFilter {
  address?: Address            // 合约地址
  topics?: (Hash | Hash[] | null)[] // 主题过滤器
  fromBlock?: bigint | 'latest' | 'earliest' | 'pending' // 起始区块
  toBlock?: bigint | 'latest' | 'earliest' | 'pending'   // 结束区块
}

// ==================== 合约相关类型 ====================

/**
 * 合约 ABI 条目
 */
export interface ContractABIEntry {
  type: 'function' | 'event' | 'constructor' | 'fallback' | 'receive'
  name?: string               // 函数/事件名称
  inputs?: Array<{
    name: string              // 参数名称
    type: string              // 参数类型
    internalType?: string     // 内部类型
    components?: any[]        // 组件（用于结构体）
  }>
  outputs?: Array<{
    name: string              // 输出名称
    type: string              // 输出类型
    internalType?: string     // 内部类型
  }>
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable' // 状态可变性
  anonymous?: boolean         // 是否匿名事件
}

/**
 * 合约信息
 */
export interface ContractInfo {
  address: Address            // 合约地址
  name: string                // 合约名称
  abi: ContractABIEntry[]     // 合约 ABI
  chainId: number             // 链 ID
  deployedBlock: number       // 部署区块
  verified: boolean           // 是否已验证
  sourceCode?: string         // 源代码（如果已验证）
}

/**
 * 合约调用选项
 */
export interface ContractCallOptions {
  from?: Address              // 调用方地址
  value?: bigint              // 发送的 ETH
  gasLimit?: bigint           // gas 限制
  gasPrice?: bigint           // gas 价格
  blockTag?: 'latest' | 'earliest' | 'pending' | bigint // 区块标签
}

// ==================== 跨链相关类型 ====================

/**
 * 跨链桥接路线
 */
export interface BridgeRoute {
  id: string                  // 路线 ID
  fromChain: number           // 源链 ID
  toChain: number             // 目标链 ID
  fromToken: TokenInfo        // 源代币
  toToken: TokenInfo          // 目标代币
  bridgeProvider: string      // 桥接提供商（如 LI.FI, Circle CCTP）
  
  // 费用信息
  feeAmount: string           // 费用金额
  feePercentage: number       // 费用百分比
  estimatedTime: number       // 预计时间（秒）
  
  // 交易信息
  steps: BridgeStep[]         // 桥接步骤
  transactionRequest?: TransactionRequest // 交易请求
}

/**
 * 桥接步骤
 */
export interface BridgeStep {
  type: 'swap' | 'bridge' | 'approval' | 'deposit' | 'withdraw' // 步骤类型
  description: string         // 步骤描述
  chainId: number             // 链 ID
  tool: string                // 使用的工具
  estimate: {
    gas: string               // 预计 gas
    time: number              // 预计时间（秒）
    cost: string              // 预计成本
  }
}

/**
 * 跨链报价
 */
export interface CrossChainQuote {
  routes: BridgeRoute[]       // 可用路线
  bestRoute: BridgeRoute      // 最佳路线
  timestamp: number           // 报价时间戳
  validity: number            // 有效期（秒）
}

// ==================== 工具类型 ====================

/**
 * 创建代币信息（兼容性函数）
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
 * 格式化 gas 价格
 */
export function formatGasPrice(wei: bigint): string {
  const gwei = wei / BigInt(1e9)
  return `${gwei.toString()} Gwei`
}

/**
 * 估算交易成本
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
 * 验证地址格式
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * 缩短地址显示
 */
export function shortenAddress(address: Address, chars = 4): string {
  if (!address) return ''
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`
}

/**
 * 检查两个地址是否相等（不区分大小写）
 */
export function areAddressesEqual(a: Address, b: Address): boolean {
  return a.toLowerCase() === b.toLowerCase()
}