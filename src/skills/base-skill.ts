/**
 * Nomad Arc 技能抽象基类
 * 
 * 此文件定义了所有技能必须实现的抽象基类。
 * 遵循技能架构模式，确保 UI 与具体协议实现解耦。
 */

import { type ISkill, type SkillMetadata, type SkillExecutionResult, type AgentContext } from '@/types/agent'
import { type ChainId } from '@/constants/chains'

// ==================== 抽象基类 ====================

/**
 * 技能抽象基类
 * 
 * 所有具体技能（ENS、LI.FI、Circle、Uniswap）都必须继承此类。
 * 提供统一的接口和通用的功能实现。
 */
export abstract class BaseSkill implements ISkill {
  // 技能元数据（由子类提供）
  abstract readonly metadata: SkillMetadata
  
  // 技能配置
  protected config: Record<string, any> = {}
  
  // 技能状态
  protected isInitialized: boolean = false
  protected lastExecutionTime: number = 0
  protected executionCount: number = 0
  
  /**
   * 构造函数
   * @param config 技能配置
   */
  constructor(config: Record<string, any> = {}) {
    this.config = config
  }
  
  /**
   * 初始化技能
   * 
   * 在技能首次使用前调用，用于设置 SDK、连接服务等。
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
   * 执行技能
   * 
   * 核心执行方法，处理参数验证、执行逻辑和结果包装。
   */
  async execute(params: Record<string, any>, context: AgentContext): Promise<SkillExecutionResult> {
    const startTime = Date.now()
    
    try {
      // 确保技能已初始化
      if (!this.isInitialized) {
        await this.initialize()
      }
      
      // 验证参数
      const validation = this.validate(params)
      if (!validation.valid) {
        return {
          success: false,
          error: `Parameter validation failed: ${validation.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
        }
      }
      
      // 验证上下文
      const contextValidation = this.validateContext(context)
      if (!contextValidation.valid) {
        return {
          success: false,
          error: `Context validation failed: ${contextValidation.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
        }
      }
      
      // 执行技能逻辑
      const result = await this.onExecute(params, context)
      
      // 更新执行统计
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
   * 验证参数
   */
  validate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // 检查必需参数
    for (const param of this.metadata.requiredParams) {
      if (params[param] === undefined || params[param] === null || params[param] === '') {
        errors.push(`Missing required parameter: ${param}`)
      }
    }
    
    // 调用子类的自定义验证
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
   * 验证执行上下文
   */
  validateContext(context: AgentContext): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // 检查链是否支持
    if (!this.isChainSupported(context.chainId)) {
      errors.push(`Chain ${context.chainId} is not supported by this skill`)
    }
    
    // 检查用户地址（如果技能需要）
    if (this.metadata.requiredParams.includes('userAddress') && !context.userAddress) {
      errors.push('User address is required but not provided in context')
    }
    
    return {
      valid: errors.length === 0,
      errors,
    }
  }
  
  /**
   * 估算执行成本
   */
  async estimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }> {
    try {
      // 验证参数
      const validation = this.validate(params)
      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`)
      }
      
      // 调用子类的估算逻辑
      return await this.onEstimate(params, context)
      
    } catch (error) {
      console.warn(`Failed to estimate for skill ${this.metadata.id}:`, error)
      
      // 返回保守的默认估算
      return {
        gasEstimate: '0',
        timeEstimate: 5000, // 5秒默认
        costEstimate: 'Unknown',
      }
    }
  }
  
  /**
   * 检查链是否支持
   */
  isChainSupported(chainId: number): boolean {
    return this.metadata.supportedChains.includes(chainId)
  }
  
  /**
   * 获取技能状态
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
   * 重置技能状态
   */
  reset(): void {
    this.isInitialized = false
    this.lastExecutionTime = 0
    this.executionCount = 0
    this.onReset()
  }
  
  // ==================== 抽象方法（由子类实现） ====================
  
  /**
   * 初始化逻辑（子类实现）
   */
  protected abstract onInitialize(): Promise<void>
  
  /**
   * 执行逻辑（子类实现）
   */
  protected abstract onExecute(params: Record<string, any>, context: AgentContext): Promise<any>
  
  /**
   * 自定义参数验证（子类实现，可选）
   */
  protected onValidate(params: Record<string, any>): { valid: boolean; errors: string[] } | null {
    return null
  }
  
  /**
   * 估算逻辑（子类实现）
   */
  protected abstract onEstimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }>
  
  /**
   * 重置逻辑（子类实现，可选）
   */
  protected onReset(): void {
    // 默认无操作
  }
  
  // ==================== 工具方法 ====================
  
  /**
   * 格式化错误信息
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
   * 记录技能执行日志
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
   * 清理参数（移除敏感信息）
   */
  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = { ...params }
    
    // 移除可能的敏感字段
    const sensitiveFields = ['privateKey', 'secret', 'password', 'mnemonic', 'seed']
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***'
      }
    })
    
    return sanitized
  }
  
  /**
   * 清理结果
   */
  private sanitizeResult(result: any): any {
    if (!result || typeof result !== 'object') {
      return result
    }
    
    // 深度复制并清理
    const sanitized = JSON.parse(JSON.stringify(result))
    
    // 可以添加更多的清理逻辑
    
    return sanitized
  }
  
  /**
   * 掩码地址（保护隐私）
   */
  private maskAddress(address: string): string {
    if (address.length <= 10) return address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }
}

// ==================== 技能工厂 ====================

/**
 * 技能注册表
 */
export class SkillRegistry {
  private static instance: SkillRegistry
  private skills: Map<string, BaseSkill> = new Map()
  
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry()
    }
    return SkillRegistry.instance
  }
  
  /**
   * 注册技能
   */
  register(skill: BaseSkill): void {
    if (this.skills.has(skill.metadata.id)) {
      console.warn(`Skill ${skill.metadata.id} is already registered, overwriting`)
    }
    
    this.skills.set(skill.metadata.id, skill)
    console.log(`Skill ${skill.metadata.id} registered successfully`)
  }
  
  /**
   * 获取技能
   */
  get(skillId: string): BaseSkill | undefined {
    return this.skills.get(skillId)
  }
  
  /**
   * 获取所有技能
   */
  getAll(): BaseSkill[] {
    return Array.from(this.skills.values())
  }
  
  /**
   * 获取技能元数据列表
   */
  getAllMetadata(): SkillMetadata[] {
    return this.getAll().map(skill => skill.metadata)
  }
  
  /**
   * 检查技能是否存在
   */
  has(skillId: string): boolean {
    return this.skills.has(skillId)
  }
  
  /**
   * 移除技能
   */
  remove(skillId: string): boolean {
    return this.skills.delete(skillId)
  }
  
  /**
   * 清空注册表
   */
  clear(): void {
    this.skills.clear()
  }
  
  /**
   * 获取支持特定链的技能
   */
  getSkillsForChain(chainId: number): BaseSkill[] {
    return this.getAll().filter(skill => skill.isChainSupported(chainId))
  }
  
  /**
   * 初始化所有技能
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

// ==================== 工具函数 ====================

/**
 * 创建技能实例并注册
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
 * 获取技能注册表实例（便捷函数）
 */
export function getSkillRegistry(): SkillRegistry {
  return SkillRegistry.getInstance()
}