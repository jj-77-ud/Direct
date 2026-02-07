/**
 * Direct Intent Parser
 * 
 * This file provides DeepSeek AI-based intent parsing service.
 * Responsible for converting natural language instructions into structured blockchain operation intents.
 */

import { getDeepSeekClient, type NomadDeepSeekClient } from './client'
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
 * Intent Parsing Result
 */
export interface IntentParserResult {
  intent: NomadIntent | null
  confidence: number
  error?: string
  executionTime: number
  cached: boolean
}

/**
 * Intent Parser Configuration
 */
export interface IntentParserConfig {
  /**
   * Whether to enable caching
   */
  enableCache?: boolean
  
  /**
   * Maximum cache size
   */
  maxCacheSize?: number
  
  /**
   * Minimum confidence threshold
   */
  minConfidence?: number
  
  /**
   * Whether to enable verbose logging
   */
  verbose?: boolean
}

/**
 * Default Configuration
 */
const DEFAULT_CONFIG: IntentParserConfig = {
  enableCache: true,
  maxCacheSize: 100,
  minConfidence: 0.3,
  verbose: false,
}

/**
 * Cache Entry
 */
interface CacheEntry {
  intent: NomadIntent | null
  confidence: number
  error?: string
  timestamp: number
}

/**
 * Nomad Arc Intent Parser
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
   * Parse Natural Language Instruction
   */
  async parse(userInput: string): Promise<IntentParserResult> {
    const startTime = Date.now()
    
    try {
      // Check cache
      const cacheKey = this.generateCacheKey(userInput)
      if (this.config.enableCache) {
        const cached = this.cache.get(cacheKey)
        if (cached && this.isCacheValid(cached)) {
          if (this.config.verbose) {
            console.log(`[IntentParser] Using cached result: ${cacheKey}`)
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
        console.log(`[IntentParser] Parsing instruction: "${userInput}"`)
      }

      // Call DeepSeek client for parsing
      const result = await this.client.parseIntent(userInput)
      
      // Check confidence threshold
      if (result.confidence < (this.config.minConfidence || 0)) {
        if (this.config.verbose) {
          console.warn(`[IntentParser] Confidence too low: ${result.confidence} < ${this.config.minConfidence}`)
        }
      }

      // Cache result
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
      console.error('[IntentParser] Parsing failed:', error)
      
      return {
        intent: null,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred during parsing',
        executionTime: Date.now() - startTime,
        cached: false,
      }
    }
  }

  /**
   * Batch Parse Multiple Instructions
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
   * Validate Intent Completeness
   */
  validateIntent(intent: NomadIntent): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic validation
    if (!intent.id) {
      errors.push('Intent missing ID')
    }

    if (!intent.type) {
      errors.push('Intent missing type')
    }

    if (!intent.description) {
      warnings.push('Intent missing description')
    }

    if (!intent.chainId) {
      warnings.push('Intent missing chain ID, will use default chain')
    }

    // Type-specific validation - use type guards for safe access
    if (isSwapIntent(intent)) {
      if (!intent.params.fromToken || !intent.params.toToken) {
        errors.push('Swap intent missing token information')
      }
      if (!intent.params.amountIn) {
        errors.push('Swap intent missing input amount')
      }
    } else if (isBridgeIntent(intent)) {
      if (!intent.params.fromChainId || !intent.params.toChainId) {
        errors.push('Bridge intent missing chain ID information')
      }
      if (!intent.params.token) {
        errors.push('Bridge intent missing token information')
      }
    } else if (isCctpIntent(intent)) {
      if (!intent.params.fromChainId || !intent.params.toChainId) {
        errors.push('CCTP cross-chain intent missing chain ID information')
      }
      if (!intent.params.amount) {
        errors.push('CCTP cross-chain intent missing amount information')
      }
    } else if (isResolveEnsIntent(intent)) {
      if (!intent.params.domain) {
        errors.push('ENS resolution intent missing domain')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Get Cross-Chain Path Recommendation
   */
  async getCrossChainRecommendation(params: {
    fromChainId: number
    toChainId: number
    tokenSymbol: string
    amount: string
  }): Promise<{
    recommendedProtocol: 'LI.FI' | 'Circle CCTP' | 'Other'
    reasoning: string
    estimatedTime: string
    estimatedCost: string
  }> {
    return await this.client.getCrossChainRecommendation(params)
  }

  /**
   * Generate Transaction Explanation
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
   * Test AI Service Connection
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.client.testConnection()
    } catch (error) {
      console.error('[IntentParser] AI service connection test failed:', error)
      return false
    }
  }

  /**
   * Get Parsing Statistics
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
      cacheHits: 0, // Need to track in actual usage
      cacheSize: this.cache.size,
      averageConfidence,
    }
  }

  /**
   * Clear Cache
   */
  clearCache(): void {
    this.cache.clear()
    if (this.config.verbose) {
      console.log('[IntentParser] Cache cleared')
    }
  }

  /**
   * Get Current Configuration
   */
  getConfig(): IntentParserConfig {
    return { ...this.config }
  }

  /**
   * Update Configuration
   */
  updateConfig(newConfig: Partial<IntentParserConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // If caching is disabled, clear existing cache
    if (newConfig.enableCache === false) {
      this.clearCache()
    }
    
    if (this.config.verbose) {
      console.log('[IntentParser] Configuration updated:', this.config)
    }
  }

  // ==================== Private Methods ====================

  /**
   * Generate Cache Key
   */
  private generateCacheKey(userInput: string): string {
    // Simple hash function
    let hash = 0
    for (let i = 0; i < userInput.length; i++) {
      const char = userInput.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `intent_${hash.toString(16)}`
  }

  /**
   * Check if Cache is Valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    // Cache validity period is 5 minutes
    const cacheTTL = 5 * 60 * 1000 // 5 minutes
    return Date.now() - entry.timestamp < cacheTTL
  }

  /**
   * Add to Cache
   */
  private addToCache(key: string, entry: CacheEntry): void {
    // Check cache size limit
    if (this.cache.size >= (this.config.maxCacheSize || 100)) {
      // Remove oldest entry
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
      console.log(`[IntentParser] Result cached: ${key}`)
    }
  }
}

// ==================== Singleton Instance ====================

let globalInstance: IntentParser | null = null

/**
 * Get Global Intent Parser Instance
 */
export function getIntentParser(config?: IntentParserConfig): IntentParser {
  if (!globalInstance) {
    globalInstance = new IntentParser(config)
  }
  return globalInstance
}

/**
 * Create New Intent Parser Instance
 */
export function createIntentParser(config: IntentParserConfig): IntentParser {
  return new IntentParser(config)
}