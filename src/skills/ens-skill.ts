/**
 * ENS 技能实现
 * 
 * 封装 ENS（Ethereum Name Service）域名解析逻辑。
 * 支持正向解析（域名 -> 地址）和反向解析（地址 -> 域名）。
 */

import { BaseSkill, createAndRegisterSkill } from './base-skill'
import { type SkillMetadata, type AgentContext, type SkillExecutionResult } from '@/types/agent'
import { type Address } from '@/types/blockchain'
import { ChainId } from '@/constants/chains'

// ==================== 技能配置 ====================

/**
 * ENS 技能配置
 */
export interface EnsSkillConfig {
  // ENS 注册表地址（不同链可能不同）
  ensRegistryAddress?: Address
  
  // 解析器配置
  defaultResolver?: Address
  
  // 缓存配置
  cacheTtl?: number // 缓存有效期（毫秒）
  
  // 重试配置
  maxRetries?: number
  retryDelay?: number
}

// ==================== 技能实现 ====================

/**
 * ENS 技能类
 */
export class EnsSkill extends BaseSkill {
  // 技能元数据
  readonly metadata: SkillMetadata = {
    id: 'ens',
    name: 'ENS Domain Resolver',
    description: '解析 ENS 域名与地址之间的映射关系',
    version: '1.0.0',
    author: 'Nomad Arc Team',
    
    capabilities: [
      'resolve_ens',      // 解析 ENS 域名
      'reverse_resolve',  // 反向解析地址
      'check_availability', // 检查域名可用性
    ],
    
    requiredParams: ['action'], // action: 'resolve' | 'reverse' | 'check'
    optionalParams: ['domain', 'address', 'chainId'],
    
    supportedChains: [
      ChainId.ETHEREUM,      // 以太坊主网
      ChainId.SEPOLIA,       // Sepolia 测试网
      ChainId.ARBITRUM,      // Arbitrum 主网
      ChainId.ARBITRUM_SEPOLIA, // Arbitrum Sepolia
      ChainId.BASE,          // Base 主网
      ChainId.BASE_SEPOLIA,  // Base Sepolia
      ChainId.OPTIMISM,      // Optimism 主网
      ChainId.POLYGON,       // Polygon 主网
    ],
    
    isAsync: true,
  }
  
  // 技能特定配置
  private ensConfig: Required<EnsSkillConfig>
  
  // 缓存
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  
  /**
   * 构造函数
   */
  constructor(config: EnsSkillConfig = {}) {
    super(config)
    
    this.ensConfig = {
      ensRegistryAddress: config.ensRegistryAddress || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // 主网默认
      defaultResolver: config.defaultResolver || '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      cacheTtl: config.cacheTtl || 5 * 60 * 1000, // 5分钟
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    }
  }
  
  // ==================== 抽象方法实现 ====================
  
  /**
   * 初始化 ENS 技能
   */
  protected async onInitialize(): Promise<void> {
    console.log('Initializing ENS skill...')
    
    // 这里可以初始化 ENSjs 或其他 ENS SDK
    // 由于我们还没有真实的 SDK 信息，这里只做框架初始化
    
    // 清空缓存
    this.cache.clear()
    
    console.log('ENS skill initialized (framework only)')
  }
  
  /**
   * 执行 ENS 操作
   */
  protected async onExecute(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { action } = params
    
    switch (action) {
      case 'resolve':
        return await this.resolveEns(params, context)
      
      case 'reverse':
        return await this.reverseResolve(params, context)
      
      case 'check':
        return await this.checkAvailability(params, context)
      
      default:
        throw new Error(`Unsupported ENS action: ${action}`)
    }
  }
  
  /**
   * 自定义参数验证
   */
  protected onValidate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const { action } = params
    
    // 验证 action 参数
    if (!action) {
      errors.push('Missing required parameter: action')
    } else if (!['resolve', 'reverse', 'check'].includes(action)) {
      errors.push(`Invalid action: ${action}. Must be one of: resolve, reverse, check`)
    }
    
    // 根据 action 验证其他参数
    if (action === 'resolve') {
      if (!params.domain) {
        errors.push('Missing required parameter for resolve action: domain')
      } else if (!this.isValidDomain(params.domain)) {
        errors.push(`Invalid domain format: ${params.domain}`)
      }
    }
    
    if (action === 'reverse') {
      if (!params.address) {
        errors.push('Missing required parameter for reverse action: address')
      } else if (!this.isValidAddress(params.address)) {
        errors.push(`Invalid address format: ${params.address}`)
      }
    }
    
    if (action === 'check') {
      if (!params.domain) {
        errors.push('Missing required parameter for check action: domain')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    }
  }
  
  /**
   * 估算执行成本
   */
  protected async onEstimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }> {
    // ENS 解析通常是只读操作，gas 消耗很少
    return {
      gasEstimate: '0', // 只读操作，无 gas 消耗
      timeEstimate: 2000, // 2秒估计
      costEstimate: 'Free (read-only)',
    }
  }
  
  // ==================== 具体操作方法 ====================
  
  /**
   * 解析 ENS 域名
   */
  private async resolveEns(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { domain, chainId = context.chainId } = params
    
    // 检查缓存
    const cacheKey = `resolve:${domain}:${chainId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }
    
    console.log(`Resolving ENS domain: ${domain} on chain ${chainId}`)
    
    try {
      // 使用真实的 ENS SDK 实现
      const { resolveEnsDomain } = await import('@/lib/ens')
      const address = await resolveEnsDomain(domain, chainId)
      
      const result = {
        domain,
        chainId,
        address: address || '0x0000000000000000000000000000000000000000' as Address,
        resolver: this.ensConfig.defaultResolver,
        resolvedAt: Date.now(),
        isResolved: !!address,
        note: address ? '域名解析成功' : '域名未解析或不存在',
        implementationRequired: false, // 标记为已实现
      }
      
      // 存入缓存（如果解析成功）
      if (address) {
        this.setCache(cacheKey, result)
      }
      
      // 记录执行日志
      this.logExecution('resolve', params, context, result)
      
      return result
    } catch (error) {
      console.error(`Failed to resolve ENS domain ${domain}:`, error)
      
      // 返回错误信息
      const errorResult = {
        domain,
        chainId,
        address: '0x0000000000000000000000000000000000000000' as Address,
        resolver: this.ensConfig.defaultResolver,
        resolvedAt: Date.now(),
        isResolved: false,
        note: `解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        implementationRequired: false,
        error: true,
        errorMessage: error instanceof Error ? error.message : '未知错误',
      }
      
      this.logExecution('resolve', params, context, errorResult)
      return errorResult
    }
  }
  
  /**
   * 反向解析地址
   */
  private async reverseResolve(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { address, chainId = context.chainId } = params
    
    // 检查缓存
    const cacheKey = `reverse:${address}:${chainId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }
    
    console.log(`Reverse resolving address: ${address} on chain ${chainId}`)
    
    try {
      // 使用真实的 ENS SDK 实现
      const { reverseResolveAddress } = await import('@/lib/ens')
      const domain = await reverseResolveAddress(address, chainId)
      
      const result = {
        address,
        chainId,
        domain: domain || '未设置域名',
        resolver: this.ensConfig.defaultResolver,
        resolvedAt: Date.now(),
        isResolved: !!domain,
        note: domain ? '地址反向解析成功' : '地址未设置 ENS 域名',
        implementationRequired: false, // 标记为已实现
      }
      
      // 存入缓存（如果解析成功）
      if (domain) {
        this.setCache(cacheKey, result)
      }
      
      // 记录执行日志
      this.logExecution('reverse_resolve', params, context, result)
      
      return result
    } catch (error) {
      console.error(`Failed to reverse resolve address ${address}:`, error)
      
      // 返回错误信息
      const errorResult = {
        address,
        chainId,
        domain: '解析失败',
        resolver: this.ensConfig.defaultResolver,
        resolvedAt: Date.now(),
        isResolved: false,
        note: `反向解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        implementationRequired: false,
        error: true,
        errorMessage: error instanceof Error ? error.message : '未知错误',
      }
      
      this.logExecution('reverse_resolve', params, context, errorResult)
      return errorResult
    }
  }
  
  /**
   * 检查域名可用性
   */
  private async checkAvailability(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { domain, chainId = context.chainId } = params
    
    console.log(`Checking domain availability: ${domain} on chain ${chainId}`)
    
    try {
      // 使用真实的 ENS SDK 实现
      const { checkEnsAvailability, getEnsRecords } = await import('@/lib/ens')
      const isAvailable = await checkEnsAvailability(domain, chainId)
      
      // 尝试获取更多信息
      let additionalInfo = {}
      if (!isAvailable) {
        try {
          const records = await getEnsRecords(domain, chainId)
          if (records) {
            additionalInfo = {
              hasRecords: true,
              textRecords: records.texts,
              addressRecords: records.coins,
              contentHash: records.contentHash,
            }
          }
        } catch (recordError) {
          // 忽略记录获取错误
          console.log(`Could not get additional records for ${domain}:`, recordError)
        }
      }
      
      const result = {
        domain,
        chainId,
        isAvailable,
        price: isAvailable ? '需要注册费用' : '不可用',
        expiresAt: null, // ENSjs 需要额外调用获取过期时间
        checkedAt: Date.now(),
        note: isAvailable ? '域名可用' : '域名已被注册',
        implementationRequired: false, // 标记为已实现
        ...additionalInfo,
      }
      
      // 记录执行日志
      this.logExecution('check_availability', params, context, result)
      
      return result
    } catch (error) {
      console.error(`Failed to check domain availability for ${domain}:`, error)
      
      // 返回错误信息
      const errorResult = {
        domain,
        chainId,
        isAvailable: false,
        price: '检查失败',
        expiresAt: null,
        checkedAt: Date.now(),
        note: `可用性检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
        implementationRequired: false,
        error: true,
        errorMessage: error instanceof Error ? error.message : '未知错误',
      }
      
      this.logExecution('check_availability', params, context, errorResult)
      return errorResult
    }
  }
  
  // ==================== 工具方法 ====================
  
  /**
   * 验证域名格式
   */
  private isValidDomain(domain: string): boolean {
    // 简单的 ENS 域名验证
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.eth$/i.test(domain)
  }
  
  /**
   * 验证地址格式
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  
  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > this.ensConfig.cacheTtl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  /**
   * 设置缓存
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }
  
  
  /**
   * 重置技能
   */
  protected onReset(): void {
    this.cache.clear()
  }
}

// ==================== 导出和注册 ====================

/**
 * 创建并注册 ENS 技能实例
 */
export function initializeEnsSkill(config: EnsSkillConfig = {}): EnsSkill {
  return createAndRegisterSkill(EnsSkill, config)
}

/**
 * 获取 ENS 技能实例
 */
export async function getEnsSkill(): Promise<EnsSkill | undefined> {
  try {
    // 使用 ES 模块动态导入避免循环依赖
    const { getSkillRegistry } = await import('./base-skill')
    const registry = getSkillRegistry()
    return registry.get('ens') as EnsSkill | undefined
  } catch (error) {
    console.error('Failed to get ENS skill:', error)
    return undefined
  }
}