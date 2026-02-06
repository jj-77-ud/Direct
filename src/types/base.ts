/**
 * Nomad Arc 基础类型定义
 * 
 * 此文件定义了不依赖外部包的基础类型，用于避免循环依赖。
 * 当外部包（如 viem）未安装时，这些类型仍然可用。
 */

// ==================== 基础类型 ====================

/**
 * 以太坊地址类型 (0x 开头，40个十六进制字符)
 */
export type Address = `0x${string}`

/**
 * 交易哈希类型 (0x 开头，64个十六进制字符)
 */
export type Hash = `0x${string}`

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
 * 代币信息
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
 * 区块链网络配置
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

// ==================== 工具函数 ====================

/**
 * 验证地址格式
 */
export function isValidAddress(address: string): address is Address {
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

/**
 * 创建代币信息
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
 * 类型守卫：检查是否为有效地址
 */
export function assertValidAddress(address: string): asserts address is Address {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: ${address}`)
  }
}

/**
 * 安全转换字符串为地址类型
 */
export function toAddress(address: string): Address {
  assertValidAddress(address)
  return address
}

/**
 * 空地址常量
 */
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

/**
 * 空哈希常量
 */
export const ZERO_HASH: Hash = '0x0000000000000000000000000000000000000000000000000000000000000000'