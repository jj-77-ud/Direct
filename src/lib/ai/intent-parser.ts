/**
 * Nomad Arc 意图解析器
 * 
 * 此文件提供了基于 DeepSeek AI 的意图解析服务。
 * 负责将自然语言指令转换为结构化的区块链操作意图。
 */

import { getDeepSeekClient, type NomadDeepSeekClient } from './deepseek-client'
import {
  type NomadIntent,
  IntentType,
  type IntentResult,
  isSwapIntent,
  isBridgeIntent,
  isCctpIntent,
  isResolveEnsIntent
} from '@/types/intent'

/**
 * 意图解析结果
 */
export interface IntentParserResult {
  intent: NomadIntent | null
  confidence: number
  error?: string
  executionTime: number
  cached: boolean
}

/**
 * 意图解析器配置
 */
export interface IntentParserConfig {
  /**
   * 是否启用缓存
   */
  enableCache?: boolean
  
  /**
   * 缓存最大大小
   */
  maxCacheSize?: number
  
  /**
   * 最小置信度阈值
   */
  minConfidence?: number
  
  /**
   * 是否启用详细日志
   */
  verbose?: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: IntentParserConfig = {
  enableCache: true,
  maxCacheSize: 100,
  minConfidence: 0.3,
  verbose: false,
}

/**
 * 缓存条目
 */
interface CacheEntry {
  intent: NomadIntent | null
  confidence: number
  error?: string
  timestamp: number
}

/**
 * Nomad Arc 意图解析器
 */
export class IntentParser {
  private client: NomadDeepSeekClient
  private config: IntentParserConfig
  private cache: Map<string, CacheEntry>
  
  constructor(config: IntentParserConfig = {}) {
    this.client = getDeepSeekClient()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.cache = new Map()
  }

  /**
   * 解析自然语言指令
   */
  async parse(userInput: string): Promise<IntentParserResult> {
    const startTime = Date.now()
    
    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(userInput)
      if (this.config.enableCache) {
        const cached = this.cache.get(cacheKey)
        if (cached && this.isCacheValid(cached)) {
          if (this.config.verbose) {
            console.log(`[IntentParser] 使用缓存结果: ${cacheKey}`)
          }
          return {
            intent: cached.intent,
            confidence: cached.confidence,
            error: cached.error,
            executionTime: Date.now() - startTime,
            cached: true,
          }
        }
      }

      if (this.config.verbose) {
        console.log(`[IntentParser] 解析指令: "${userInput}"`)
      }

      // 调用 DeepSeek 客户端进行解析
      const result = await this.client.parseIntent(userInput)
      
      // 检查置信度阈值
      if (result.confidence < (this.config.minConfidence || 0)) {
        if (this.config.verbose) {
          console.warn(`[IntentParser] 置信度过低: ${result.confidence} < ${this.config.minConfidence}`)
        }
      }

      // 缓存结果
      if (this.config.enableCache && result.intent) {
        this.addToCache(cacheKey, {
          intent: result.intent,
          confidence: result.confidence,
          error: result.error,
          timestamp: Date.now(),
        })
      }

      return {
        intent: result.intent,
        confidence: result.confidence,
        error: result.error,
        executionTime: Date.now() - startTime,
        cached: false,
      }

    } catch (error) {
      console.error('[IntentParser] 解析失败:', error)
      
      return {
        intent: null,
        confidence: 0,
        error: error instanceof Error ? error.message : '解析过程中发生未知错误',
        executionTime: Date.now() - startTime,
        cached: false,
      }
    }
  }

  /**
   * 批量解析多个指令
   */
  async parseBatch(inputs: string[]): Promise<IntentParserResult[]> {
    const results: IntentParserResult[] = []
    
    for (const input of inputs) {
      const result = await this.parse(input)
      results.push(result)
    }
    
    return results
  }

  /**
   * 验证意图是否完整
   */
  validateIntent(intent: NomadIntent): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // 基本验证
    if (!intent.id) {
      errors.push('意图缺少 ID')
    }

    if (!intent.type) {
      errors.push('意图缺少类型')
    }

    if (!intent.description) {
      warnings.push('意图缺少描述')
    }

    if (!intent.chainId) {
      warnings.push('意图缺少链 ID，将使用默认链')
    }

    // 类型特定验证 - 使用类型守卫安全访问
    if (isSwapIntent(intent)) {
      if (!intent.params.fromToken || !intent.params.toToken) {
        errors.push('兑换意图缺少代币信息')
      }
      if (!intent.params.amountIn) {
        errors.push('兑换意图缺少输入金额')
      }
    } else if (isBridgeIntent(intent)) {
      if (!intent.params.fromChainId || !intent.params.toChainId) {
        errors.push('跨链意图缺少链 ID 信息')
      }
      if (!intent.params.token) {
        errors.push('跨链意图缺少代币信息')
      }
    } else if (isCctpIntent(intent)) {
      if (!intent.params.fromChainId || !intent.params.toChainId) {
        errors.push('CCTP 跨链意图缺少链 ID 信息')
      }
      if (!intent.params.amount) {
        errors.push('CCTP 跨链意图缺少金额信息')
      }
    } else if (isResolveEnsIntent(intent)) {
      if (!intent.params.domain) {
        errors.push('ENS 解析意图缺少域名')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 获取跨链路径建议
   */
  async getCrossChainRecommendation(params: {
    fromChainId: number
    toChainId: number
    tokenSymbol: string
    amount: string
  }): Promise<{
    recommendedProtocol: 'LI.FI' | 'Circle CCTP' | '其他'
    reasoning: string
    estimatedTime: string
    estimatedCost: string
  }> {
    return await this.client.getCrossChainRecommendation(params)
  }

  /**
   * 生成交易解释
   */
  async generateTransactionExplanation(params: {
    intentType: string
    params: any
    estimatedGas: string
    estimatedTime: string
  }): Promise<string> {
    return await this.client.generateTransactionExplanation(params)
  }

  /**
   * 测试 AI 服务连接
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.client.testConnection()
    } catch (error) {
      console.error('[IntentParser] AI 服务连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取解析统计信息
   */
  getStats(): {
    totalParsed: number
    cacheHits: number
    cacheSize: number
    averageConfidence: number
  } {
    let totalConfidence = 0
    let totalCount = 0
    
    for (const entry of this.cache.values()) {
      if (entry.intent) {
        totalConfidence += entry.confidence
        totalCount++
      }
    }
    
    const averageConfidence = totalCount > 0 ? totalConfidence / totalCount : 0
    
    return {
      totalParsed: totalCount,
      cacheHits: 0, // 需要在实际使用中跟踪
      cacheSize: this.cache.size,
      averageConfidence,
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
    if (this.config.verbose) {
      console.log('[IntentParser] 缓存已清空')
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): IntentParserConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<IntentParserConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 如果禁用了缓存，清空现有缓存
    if (newConfig.enableCache === false) {
      this.clearCache()
    }
    
    if (this.config.verbose) {
      console.log('[IntentParser] 配置已更新:', this.config)
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 生成缓存键
   */
  private generateCacheKey(userInput: string): string {
    // 简单哈希函数
    let hash = 0
    for (let i = 0; i < userInput.length; i++) {
      const char = userInput.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return `intent_${hash.toString(16)}`
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(entry: CacheEntry): boolean {
    // 缓存有效期为5分钟
    const cacheTTL = 5 * 60 * 1000 // 5分钟
    return Date.now() - entry.timestamp < cacheTTL
  }

  /**
   * 添加到缓存
   */
  private addToCache(key: string, entry: CacheEntry): void {
    // 检查缓存大小限制
    if (this.cache.size >= (this.config.maxCacheSize || 100)) {
      // 移除最旧的条目
      let oldestKey = ''
      let oldestTime = Date.now()
      
      for (const [cacheKey, cacheEntry] of this.cache.entries()) {
        if (cacheEntry.timestamp < oldestTime) {
          oldestTime = cacheEntry.timestamp
          oldestKey = cacheKey
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    this.cache.set(key, entry)
    
    if (this.config.verbose) {
      console.log(`[IntentParser] 已缓存结果: ${key}`)
    }
  }
}

// ==================== 单例实例 ====================

let globalInstance: IntentParser | null = null

/**
 * 获取全局意图解析器实例
 */
export function getIntentParser(config?: IntentParserConfig): IntentParser {
  if (!globalInstance) {
    globalInstance = new IntentParser(config)
  }
  return globalInstance
}

/**
 * 创建新的意图解析器实例
 */
export function createIntentParser(config: IntentParserConfig): IntentParser {
  return new IntentParser(config)
}