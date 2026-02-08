/**
 * Direct Skill Abstract Base Class
 * 
 * This file defines the abstract base class that all skills must implement.
 * Follows the skill architecture pattern to ensure UI decoupling from specific protocol implementations.
 */

import { type ISkill, type SkillMetadata, type SkillExecutionResult, type AgentContext } from '@/types/agent'
import { type ChainId } from '@/constants/chains'

// ==================== Abstract Base Class ====================

/**
 * Skill Abstract Base Class
 * 
 * All concrete skills (ENS, LI.FI, Circle, Uniswap) must inherit from this class.
 * Provides unified interface and common functionality implementation.
 */
export abstract class BaseSkill implements ISkill {
  // Skill metadata (provided by subclasses)
  abstract readonly metadata: SkillMetadata
  
  // Skill configuration
  protected config: Record<string, any> = {}
  
  // Skill state
  protected isInitialized: boolean = false
  protected lastExecutionTime: number = 0
  protected executionCount: number = 0
  
  /**
   * Constructor
   * @param config Skill configuration
   */
  constructor(config: Record<string, any> = {}) {
    this.config = config
  }
  
  /**
   * Initialize Skill
   * 
   * Called before first use of the skill, used for setting up SDKs, connecting services, etc.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }
    
    try {
      await this.onInitialize()
      this.isInitialized = true
      console.log(`Skill ${this.metadata.id} initialized successfully`)
    } catch (error) {
      console.error(`Failed to initialize skill ${this.metadata.id}:`, error)
      throw new Error(`Skill initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * Execute Skill
   * 
   * Core execution method, handles parameter validation, execution logic, and result wrapping.
   */
  async execute(params: Record<string, any>, context: AgentContext): Promise<SkillExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Ensure skill is initialized
      if (!this.isInitialized) {
        await this.initialize()
      }
      
      // Validate parameters
      const validation = this.validate(params)
      if (!validation.valid) {
        return {
          success: false,
          error: `Parameter validation failed: ${validation.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
        }
      }
      
      // Validate context
      const contextValidation = this.validateContext(context)
      if (!contextValidation.valid) {
        return {
          success: false,
          error: `Context validation failed: ${contextValidation.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
        }
      }
      
      // Execute skill logic
      const result = await this.onExecute(params, context)
      
      // Update execution statistics
      this.lastExecutionTime = Date.now()
      this.executionCount++
      
      return {
        success: true,
        output: result,
        executionTime: Date.now() - startTime,
      }
      
    } catch (error) {
      console.error(`Skill ${this.metadata.id} execution failed:`, error)
      
      return {
        success: false,
        error: this.formatError(error),
        executionTime: Date.now() - startTime,
      }
    }
  }
  
  /**
   * Validate Parameters
   */
  validate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check required parameters
    for (const param of this.metadata.requiredParams) {
      if (params[param] === undefined || params[param] === null || params[param] === '') {
        errors.push(`Missing required parameter: ${param}`)
      }
    }
    
    // Call subclass custom validation
    const customValidation = this.onValidate(params)
    if (customValidation && !customValidation.valid) {
      errors.push(...customValidation.errors)
    }
    
    return {
      valid: errors.length === 0,
      errors,
    }
  }
  
  /**
   * Validate Execution Context
   */
  validateContext(context: AgentContext): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check if chain is supported
    if (!this.isChainSupported(context.chainId)) {
      errors.push(`Chain ${context.chainId} is not supported by this skill`)
    }
    
    // Check user address (if skill requires it)
    if (this.metadata.requiredParams.includes('userAddress') && !context.userAddress) {
      errors.push('User address is required but not provided in context')
    }
    
    return {
      valid: errors.length === 0,
      errors,
    }
  }
  
  /**
   * Estimate Execution Cost
   */
  async estimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }> {
    try {
      // Validate parameters
      const validation = this.validate(params)
      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`)
      }
      
      // Call subclass estimation logic
      return await this.onEstimate(params, context)
      
    } catch (error) {
      console.warn(`Failed to estimate for skill ${this.metadata.id}:`, error)
      
      // Return conservative default estimate
      return {
        gasEstimate: '0',
        timeEstimate: 5000, // 5 seconds default
        costEstimate: 'Unknown',
      }
    }
  }
  
  /**
   * Check if Chain is Supported
   */
  isChainSupported(chainId: number): boolean {
    return this.metadata.supportedChains.includes(chainId)
  }
  
  /**
   * Get Skill Status
   */
  getStatus(): {
    isInitialized: boolean
    lastExecutionTime: number
    executionCount: number
    supportedChains: number[]
  } {
    return {
      isInitialized: this.isInitialized,
      lastExecutionTime: this.lastExecutionTime,
      executionCount: this.executionCount,
      supportedChains: this.metadata.supportedChains,
    }
  }
  
  /**
   * Reset Skill State
   */
  reset(): void {
    this.isInitialized = false
    this.lastExecutionTime = 0
    this.executionCount = 0
    this.onReset()
  }
  
  // ==================== Abstract Methods (Implemented by Subclasses) ====================
  
  /**
   * Initialization Logic (Implemented by Subclass)
   */
  protected abstract onInitialize(): Promise<void>
  
  /**
   * Execution Logic (Implemented by Subclass)
   */
  protected abstract onExecute(params: Record<string, any>, context: AgentContext): Promise<any>
  
  /**
   * Custom Parameter Validation (Implemented by Subclass, Optional)
   */
  protected onValidate(params: Record<string, any>): { valid: boolean; errors: string[] } | null {
    return null
  }
  
  /**
   * Estimation Logic (Implemented by Subclass)
   */
  protected abstract onEstimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }>
  
  /**
   * Reset Logic (Implemented by Subclass, Optional)
   */
  protected onReset(): void {
    // Default no-op
  }
  
  // ==================== Utility Methods ====================
  
  /**
   * Format Error Message
   */
  protected formatError(error: any): string {
    if (error instanceof Error) {
      return error.message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message)
    }
    
    return 'Unknown error occurred'
  }
  
  /**
   * Log Skill Execution
   */
  protected logExecution(
    action: string,
    params: Record<string, any>,
    context: AgentContext,
    result: any
  ): void {
    const logEntry = {
      timestamp: Date.now(),
      skillId: this.metadata.id,
      action,
      params: this.sanitizeParams(params),
      context: {
        chainId: context.chainId,
        userAddress: context.userAddress ? this.maskAddress(context.userAddress) : undefined,
      },
      result: this.sanitizeResult(result),
    }
    
    console.log(`[Skill ${this.metadata.id}]`, logEntry)
  }
  
  /**
   * Sanitize Parameters (Remove Sensitive Information)
   */
  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = { ...params }
    
    // Remove possible sensitive fields
    const sensitiveFields = ['privateKey', 'secret', 'password', 'mnemonic', 'seed']
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***'
      }
    })
    
    return sanitized
  }
  
  /**
   * JSON.stringify replacer function to handle BigInt serialization
   */
  protected bigIntReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return value
  }

  /**
   * Safe JSON.stringify that handles BigInt values
   */
  protected safeStringify(obj: any, indent?: number): string {
    return JSON.stringify(obj, this.bigIntReplacer.bind(this), indent)
  }

  /**
   * Sanitize Result
   */
  private sanitizeResult(result: any): any {
    if (!result || typeof result !== 'object') {
      return result
    }
    
    // Deep copy and sanitize
    const sanitized = JSON.parse(this.safeStringify(result))
    
    // Can add more sanitization logic
    
    return sanitized
  }
  
  /**
   * Mask Address (Privacy Protection)
   */
  private maskAddress(address: string): string {
    if (address.length <= 10) return address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }
}

// ==================== Skill Factory ====================

/**
 * Skill Registry
 */
export class SkillRegistry {
  private static instance: SkillRegistry
  private skills: Map<string, BaseSkill> = new Map()
  
  private constructor() {}
  
  /**
   * Get Singleton Instance
   */
  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry()
    }
    return SkillRegistry.instance
  }
  
  /**
   * Register Skill
   */
  register(skill: BaseSkill): void {
    if (this.skills.has(skill.metadata.id)) {
      console.warn(`Skill ${skill.metadata.id} is already registered, overwriting`)
    }
    
    this.skills.set(skill.metadata.id, skill)
    console.log(`Skill ${skill.metadata.id} registered successfully`)
  }
  
  /**
   * Get Skill
   */
  get(skillId: string): BaseSkill | undefined {
    return this.skills.get(skillId)
  }
  
  /**
   * Get All Skills
   */
  getAll(): BaseSkill[] {
    return Array.from(this.skills.values())
  }
  
  /**
   * Get All Skill Metadata
   */
  getAllMetadata(): SkillMetadata[] {
    return this.getAll().map(skill => skill.metadata)
  }
  
  /**
   * Check if Skill Exists
   */
  has(skillId: string): boolean {
    return this.skills.has(skillId)
  }
  
  /**
   * Remove Skill
   */
  remove(skillId: string): boolean {
    return this.skills.delete(skillId)
  }
  
  /**
   * Clear Registry
   */
  clear(): void {
    this.skills.clear()
  }
  
  /**
   * Get Skills Supporting Specific Chain
   */
  getSkillsForChain(chainId: number): BaseSkill[] {
    return this.getAll().filter(skill => skill.isChainSupported(chainId))
  }
  
  /**
   * Initialize All Skills
   */
  async initializeAll(): Promise<void> {
    const skills = this.getAll()
    const results = await Promise.allSettled(
      skills.map(skill => skill.initialize())
    )
    
    const failures = results.filter((result): result is PromiseRejectedResult => 
      result.status === 'rejected'
    )
    
    if (failures.length > 0) {
      console.warn(`${failures.length} skills failed to initialize:`, failures.map(f => f.reason))
    }
  }
}

// ==================== Utility Functions ====================

/**
 * Create Skill Instance and Register
 */
export function createAndRegisterSkill<T extends BaseSkill>(
  SkillClass: new (config: Record<string, any>) => T,
  config: Record<string, any> = {}
): T {
  const skill = new SkillClass(config)
  SkillRegistry.getInstance().register(skill)
  return skill
}

/**
 * Get Skill Registry Instance (Convenience Function)
 */
export function getSkillRegistry(): SkillRegistry {
  return SkillRegistry.getInstance()
}