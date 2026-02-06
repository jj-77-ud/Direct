/**
 * 技能管理器
 * 
 * 解决技能初始化循环依赖问题，提供统一的技能初始化接口。
 * 确保技能按正确顺序初始化，避免循环依赖导致的注册表为空问题。
 */

import { SkillRegistry } from './base-skill'
import { type BaseSkill } from './base-skill'

/**
 * 技能初始化配置
 */
export interface SkillManagerConfig {
  /**
   * 是否启用自动初始化
   */
  autoInitialize?: boolean
  
  /**
   * 初始化超时时间（毫秒）
   */
  initializationTimeout?: number
  
  /**
   * 是否启用详细日志
   */
  verbose?: boolean
  
  /**
   * 技能特定配置
   */
  skillConfigs?: {
    ens?: Record<string, any>
    lifi?: Record<string, any>
    circle?: Record<string, any>
    uniswap?: Record<string, any>
  }
}

/**
 * 技能初始化状态
 */
export interface SkillInitializationStatus {
  skillId: string
  isInitialized: boolean
  initializationTime?: number
  error?: string
  dependencies: string[]
}

/**
 * 技能管理器类
 */
export class SkillManager {
  private static instance: SkillManager
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null
  private config: Required<SkillManagerConfig>
  private initializationStatus: Map<string, SkillInitializationStatus> = new Map()
  
  private constructor(config: SkillManagerConfig = {}) {
    this.config = {
      autoInitialize: config.autoInitialize ?? true,
      initializationTimeout: config.initializationTimeout ?? 30000,
      verbose: config.verbose ?? false,
      skillConfigs: config.skillConfigs ?? {}
    }
    
    this.initializeStatusTracking()
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(config?: SkillManagerConfig): SkillManager {
    if (!SkillManager.instance) {
      SkillManager.instance = new SkillManager(config)
    }
    return SkillManager.instance
  }
  
  /**
   * 初始化状态跟踪
   */
  private initializeStatusTracking(): void {
    const skillIds = ['ens', 'lifi', 'circle', 'uniswap']
    
    skillIds.forEach(skillId => {
      this.initializationStatus.set(skillId, {
        skillId,
        isInitialized: false,
        dependencies: this.getSkillDependencies(skillId)
      })
    })
  }
  
  /**
   * 获取技能依赖关系
   */
  private getSkillDependencies(skillId: string): string[] {
    // 定义技能之间的依赖关系
    const dependencyMap: Record<string, string[]> = {
      ens: [],           // ENS 技能无依赖
      lifi: ['ens'],     // LI.FI 可能依赖 ENS 进行地址解析
      circle: ['ens'],   // Circle 可能依赖 ENS
      uniswap: ['ens']   // Uniswap 可能依赖 ENS
    }
    
    return dependencyMap[skillId] || []
  }
  
  /**
   * 初始化所有技能
   */
  async initializeAllSkills(): Promise<void> {
    if (this.isInitialized) {
      if (this.config.verbose) {
        console.log('🔄 技能已初始化，跳过')
      }
      return
    }
    
    // 如果已经在初始化中，返回相同的 Promise
    if (this.initializationPromise) {
      return this.initializationPromise
    }
    
    this.initializationPromise = this._initializeAllSkills()
    return this.initializationPromise
  }
  
  /**
   * 实际初始化所有技能（内部方法）
   */
  private async _initializeAllSkills(): Promise<void> {
    const startTime = Date.now()
    
    if (this.config.verbose) {
      console.log('🚀 开始初始化所有技能...')
    }
    
    try {
      // 按依赖顺序初始化技能
      const initializationOrder = [
        this.initializeEnsSkill.bind(this),
        this.initializeLiFiSkill.bind(this),
        this.initializeCircleSkill.bind(this),
        this.initializeUniswapSkill.bind(this)
      ]
      
      for (const initFn of initializationOrder) {
        await this.withTimeout(
          initFn(),
          this.config.initializationTimeout,
          '技能初始化超时'
        )
      }
      
      // 初始化技能注册表中的所有技能
      const registry = SkillRegistry.getInstance()
      await registry.initializeAll()
      
      // 验证所有技能是否已初始化
      await this.validateInitialization()
      
      this.isInitialized = true
      const endTime = Date.now()
      
      if (this.config.verbose) {
        console.log(`✅ 所有技能初始化完成 (${endTime - startTime}ms)`)
        this.printInitializationStatus()
      }
      
    } catch (error) {
      console.error('❌ 技能初始化失败:', error)
      throw error
    } finally {
      this.initializationPromise = null
    }
  }
  
  /**
   * 初始化 ENS 技能
   */
  private async initializeEnsSkill(): Promise<void> {
    const skillId = 'ens'
    
    try {
      if (this.config.verbose) {
        console.log(`🔄 初始化 ${skillId} 技能...`)
      }
      
      // 动态导入以避免循环依赖
      const { initializeEnsSkill } = await import('./ens-skill')
      const skill = initializeEnsSkill(this.config.skillConfigs?.ens || {})
      
      // 更新状态
      this.updateSkillStatus(skillId, true)
      
      if (this.config.verbose) {
        console.log(`✅ ${skillId} 技能初始化成功`)
      }
      
    } catch (error) {
      this.updateSkillStatus(skillId, false, error instanceof Error ? error.message : String(error))
      throw new Error(`ENS 技能初始化失败: ${error}`)
    }
  }
  
  /**
   * 初始化 LI.FI 技能
   */
  private async initializeLiFiSkill(): Promise<void> {
    const skillId = 'lifi'
    
    try {
      if (this.config.verbose) {
        console.log(`🔄 初始化 ${skillId} 技能...`)
      }
      
      // 检查依赖是否已初始化
      if (!this.isSkillInitialized('ens')) {
        throw new Error('依赖技能 ens 未初始化')
      }
      
      // 动态导入以避免循环依赖
      const { initializeLiFiSkill } = await import('./lifi-skill')
      const skill = initializeLiFiSkill(this.config.skillConfigs?.lifi || {})
      
      // 更新状态
      this.updateSkillStatus(skillId, true)
      
      if (this.config.verbose) {
        console.log(`✅ ${skillId} 技能初始化成功`)
      }
      
    } catch (error) {
      this.updateSkillStatus(skillId, false, error instanceof Error ? error.message : String(error))
      throw new Error(`LI.FI 技能初始化失败: ${error}`)
    }
  }
  
  /**
   * 初始化 Circle 技能
   */
  private async initializeCircleSkill(): Promise<void> {
    const skillId = 'circle'
    
    try {
      if (this.config.verbose) {
        console.log(`🔄 初始化 ${skillId} 技能...`)
      }
      
      // 检查依赖是否已初始化
      if (!this.isSkillInitialized('ens')) {
        throw new Error('依赖技能 ens 未初始化')
      }
      
      // 动态导入以避免循环依赖
      const { initializeCircleSkill } = await import('./circle-skill')
      const skill = initializeCircleSkill(this.config.skillConfigs?.circle || {})
      
      // 更新状态
      this.updateSkillStatus(skillId, true)
      
      if (this.config.verbose) {
        console.log(`✅ ${skillId} 技能初始化成功`)
      }
      
    } catch (error) {
      this.updateSkillStatus(skillId, false, error instanceof Error ? error.message : String(error))
      throw new Error(`Circle 技能初始化失败: ${error}`)
    }
  }
  
  /**
   * 初始化 Uniswap 技能
   */
  private async initializeUniswapSkill(): Promise<void> {
    const skillId = 'uniswap'
    
    try {
      if (this.config.verbose) {
        console.log(`🔄 初始化 ${skillId} 技能...`)
      }
      
      // 检查依赖是否已初始化
      if (!this.isSkillInitialized('ens')) {
        throw new Error('依赖技能 ens 未初始化')
      }
      
      // 动态导入以避免循环依赖
      const { initializeUniswapSkill } = await import('./uniswap-skill')
      const skill = initializeUniswapSkill(this.config.skillConfigs?.uniswap || {})
      
      // 更新状态
      this.updateSkillStatus(skillId, true)
      
      if (this.config.verbose) {
        console.log(`✅ ${skillId} 技能初始化成功`)
      }
      
    } catch (error) {
      this.updateSkillStatus(skillId, false, error instanceof Error ? error.message : String(error))
      throw new Error(`Uniswap 技能初始化失败: ${error}`)
    }
  }
  
  /**
   * 更新技能状态
   */
  private updateSkillStatus(skillId: string, isInitialized: boolean, error?: string): void {
    const status = this.initializationStatus.get(skillId)
    if (status) {
      status.isInitialized = isInitialized
      status.initializationTime = isInitialized ? Date.now() : undefined
      status.error = error
      this.initializationStatus.set(skillId, status)
    }
  }
  
  /**
   * 检查技能是否已初始化
   */
  private isSkillInitialized(skillId: string): boolean {
    const status = this.initializationStatus.get(skillId)
    return status?.isInitialized || false
  }
  
  /**
   * 验证所有技能初始化
   */
  private async validateInitialization(): Promise<void> {
    const registry = SkillRegistry.getInstance()
    const skillIds = ['ens', 'lifi', 'circle', 'uniswap']
    
    const missingSkills: string[] = []
    
    for (const skillId of skillIds) {
      const skill = registry.get(skillId)
      if (!skill) {
        missingSkills.push(skillId)
      } else {
        const status = skill.getStatus()
        if (!status.isInitialized) {
          missingSkills.push(`${skillId} (未初始化)`)
        }
      }
    }
    
    if (missingSkills.length > 0) {
      throw new Error(`以下技能未正确初始化: ${missingSkills.join(', ')}`)
    }
  }
  
  /**
   * 打印初始化状态
   */
  private printInitializationStatus(): void {
    console.log('\n📊 技能初始化状态:')
    console.log('='.repeat(50))
    
    const registry = SkillRegistry.getInstance()
    
    for (const [skillId, status] of this.initializationStatus.entries()) {
      const skill = registry.get(skillId)
      const skillStatus = skill?.getStatus()
      
      console.log(`🔹 ${skillId}:`)
      console.log(`   注册状态: ${skill ? '✅ 已注册' : '❌ 未注册'}`)
      console.log(`   初始化状态: ${status.isInitialized ? '✅ 已初始化' : '❌ 未初始化'}`)
      
      if (status.isInitialized && status.initializationTime) {
        console.log(`   初始化时间: ${new Date(status.initializationTime).toISOString()}`)
      }
      
      if (skillStatus) {
        console.log(`   执行次数: ${skillStatus.executionCount}`)
        console.log(`   支持链: ${skillStatus.supportedChains.length} 条`)
      }
      
      if (status.error) {
        console.log(`   错误: ${status.error}`)
      }
      
      if (status.dependencies.length > 0) {
        console.log(`   依赖: ${status.dependencies.join(', ')}`)
      }
      
      console.log()
    }
  }
  
  /**
   * 带超时的 Promise 包装器
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${errorMessage} (${timeoutMs}ms)`)), timeoutMs)
    })
    
    return Promise.race([promise, timeout])
  }
  
  /**
   * 获取技能实例
   */
  getSkill<T extends BaseSkill>(skillId: string): T | undefined {
    const registry = SkillRegistry.getInstance()
    return registry.get(skillId) as T | undefined
  }
  
  /**
   * 获取所有技能
   */
  getAllSkills(): BaseSkill[] {
    const registry = SkillRegistry.getInstance()
    return registry.getAll()
  }
  
  /**
   * 获取初始化状态
   */
  getInitializationStatus(): SkillInitializationStatus[] {
    return Array.from(this.initializationStatus.values())
  }
  
  /**
   * 检查是否已初始化
   */
  isInitializedAll(): boolean {
    return this.isInitialized
  }
  
  /**
   * 重置技能管理器状态
   */
  reset(): void {
    this.isInitialized = false
    this.initializationPromise = null
    this.initializeStatusTracking()
    
    if (this.config.verbose) {
      console.log('🔄 技能管理器状态已重置')
    }
  }
}

/**
 * 获取全局技能管理器实例
 */
let globalSkillManager: SkillManager | null = null

export function getSkillManager(config?: SkillManagerConfig): SkillManager {
  if (!globalSkillManager) {
    globalSkillManager = SkillManager.getInstance(config)
  }
  return globalSkillManager
}

/**
 * 创建新的技能管理器实例
 */
export function createSkillManager(config: SkillManagerConfig): SkillManager {
  return SkillManager.getInstance(config)
}

/**
 * 初始化所有技能的便捷函数
 */
export async function initializeAllSkills(config?: SkillManagerConfig): Promise<void> {
  const skillManager = getSkillManager(config)
  return skillManager.initializeAllSkills()
}

export default {
  SkillManager,
  getSkillManager,
  createSkillManager,
  initializeAllSkills
}