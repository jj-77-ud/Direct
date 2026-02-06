/**
 * Skill Manager
 *
 * Solves circular dependency issues in skill initialization, provides a unified skill initialization interface.
 * Ensures skills are initialized in the correct order, avoiding empty registry issues caused by circular dependencies.
 */

import { SkillRegistry } from './base-skill'
import { type BaseSkill } from './base-skill'

/**
 * Skill Initialization Configuration
 */
export interface SkillManagerConfig {
  /**
   * Whether to enable auto-initialization
   */
  autoInitialize?: boolean
  
  /**
   * Initialization timeout (milliseconds)
   */
  initializationTimeout?: number
  
  /**
   * Whether to enable verbose logging
   */
  verbose?: boolean
  
  /**
   * Skill-specific configurations
   */
  skillConfigs?: {
    ens?: Record<string, any>
    lifi?: Record<string, any>
    circle?: Record<string, any>
    uniswap?: Record<string, any>
  }
}

/**
 * Skill Initialization Status
 */
export interface SkillInitializationStatus {
  skillId: string
  isInitialized: boolean
  initializationTime?: number
  error?: string
  dependencies: string[]
}

/**
 * Skill Manager Class
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
   * Get singleton instance
   */
  static getInstance(config?: SkillManagerConfig): SkillManager {
    if (!SkillManager.instance) {
      SkillManager.instance = new SkillManager(config)
    }
    return SkillManager.instance
  }
  
  /**
   * Initialize status tracking
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
   * Get skill dependencies
   */
  private getSkillDependencies(skillId: string): string[] {
    // Define dependencies between skills
    const dependencyMap: Record<string, string[]> = {
      ens: [],           // ENS skill has no dependencies
      lifi: ['ens'],     // LI.FI may depend on ENS for address resolution
      circle: ['ens'],   // Circle may depend on ENS
      uniswap: ['ens']   // Uniswap may depend on ENS
    }
    
    return dependencyMap[skillId] || []
  }
  
  /**
   * Initialize all skills
   */
  async initializeAllSkills(): Promise<void> {
    if (this.isInitialized) {
      if (this.config.verbose) {
        console.log('🔄 Skills already initialized, skipping')
      }
      return
    }
    
    // If already initializing, return the same Promise
    if (this.initializationPromise) {
      return this.initializationPromise
    }
    
    this.initializationPromise = this._initializeAllSkills()
    return this.initializationPromise
  }
  
  /**
   * Actually initialize all skills (internal method)
   */
  private async _initializeAllSkills(): Promise<void> {
    const startTime = Date.now()
    
    if (this.config.verbose) {
      console.log('🚀 Starting initialization of all skills...')
    }
    
    try {
      // Initialize skills in dependency order
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
          'Skill initialization timeout'
        )
      }
      
      // Initialize all skills in the skill registry
      const registry = SkillRegistry.getInstance()
      await registry.initializeAll()
      
      // Validate that all skills are initialized
      await this.validateInitialization()
      
      this.isInitialized = true
      const endTime = Date.now()
      
      if (this.config.verbose) {
        console.log(`✅ All skills initialization completed (${endTime - startTime}ms)`)
        this.printInitializationStatus()
      }
      
    } catch (error) {
      console.error('❌ Skill initialization failed:', error)
      throw error
    } finally {
      this.initializationPromise = null
    }
  }
  
  /**
   * Initialize ENS skill
   */
  private async initializeEnsSkill(): Promise<void> {
    const skillId = 'ens'
    
    try {
      if (this.config.verbose) {
        console.log(`🔄 Initializing ${skillId} skill...`)
      }
      
      // Dynamic import to avoid circular dependencies
      const { initializeEnsSkill } = await import('./ens-skill')
      const skill = initializeEnsSkill(this.config.skillConfigs?.ens || {})
      
      // Update status
      this.updateSkillStatus(skillId, true)
      
      if (this.config.verbose) {
        console.log(`✅ ${skillId} skill initialized successfully`)
      }
      
    } catch (error) {
      this.updateSkillStatus(skillId, false, error instanceof Error ? error.message : String(error))
      throw new Error(`ENS skill initialization failed: ${error}`)
    }
  }
  
  /**
   * Initialize LI.FI skill
   */
  private async initializeLiFiSkill(): Promise<void> {
    const skillId = 'lifi'
    
    try {
      if (this.config.verbose) {
        console.log(`🔄 Initializing ${skillId} skill...`)
      }
      
      // Check if dependency is initialized
      if (!this.isSkillInitialized('ens')) {
        throw new Error('Dependency skill ens not initialized')
      }
      
      // Dynamic import to avoid circular dependencies
      const { initializeLiFiSkill } = await import('./lifi-skill')
      const skill = initializeLiFiSkill(this.config.skillConfigs?.lifi || {})
      
      // Update status
      this.updateSkillStatus(skillId, true)
      
      if (this.config.verbose) {
        console.log(`✅ ${skillId} skill initialized successfully`)
      }
      
    } catch (error) {
      this.updateSkillStatus(skillId, false, error instanceof Error ? error.message : String(error))
      throw new Error(`LI.FI skill initialization failed: ${error}`)
    }
  }
  
  /**
   * Initialize Circle skill
   */
  private async initializeCircleSkill(): Promise<void> {
    const skillId = 'circle'
    
    try {
      if (this.config.verbose) {
        console.log(`🔄 Initializing ${skillId} skill...`)
      }
      
      // Check if dependency is initialized
      if (!this.isSkillInitialized('ens')) {
        throw new Error('Dependency skill ens not initialized')
      }
      
      // Dynamic import to avoid circular dependencies
      const { initializeCircleSkill } = await import('./circle-skill')
      const skill = initializeCircleSkill(this.config.skillConfigs?.circle || {})
      
      // Update status
      this.updateSkillStatus(skillId, true)
      
      if (this.config.verbose) {
        console.log(`✅ ${skillId} skill initialized successfully`)
      }
      
    } catch (error) {
      this.updateSkillStatus(skillId, false, error instanceof Error ? error.message : String(error))
      throw new Error(`Circle skill initialization failed: ${error}`)
    }
  }
  
  /**
   * Initialize Uniswap skill
   */
  private async initializeUniswapSkill(): Promise<void> {
    const skillId = 'uniswap'
    
    try {
      if (this.config.verbose) {
        console.log(`🔄 Initializing ${skillId} skill...`)
      }
      
      // Check if dependency is initialized
      if (!this.isSkillInitialized('ens')) {
        throw new Error('Dependency skill ens not initialized')
      }
      
      // Dynamic import to avoid circular dependencies
      const { initializeUniswapSkill } = await import('./uniswap-skill')
      const skill = initializeUniswapSkill(this.config.skillConfigs?.uniswap || {})
      
      // Update status
      this.updateSkillStatus(skillId, true)
      
      if (this.config.verbose) {
        console.log(`✅ ${skillId} skill initialized successfully`)
      }
      
    } catch (error) {
      this.updateSkillStatus(skillId, false, error instanceof Error ? error.message : String(error))
      throw new Error(`Uniswap skill initialization failed: ${error}`)
    }
  }
  
  /**
   * Update skill status
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
   * Check if skill is initialized
   */
  private isSkillInitialized(skillId: string): boolean {
    const status = this.initializationStatus.get(skillId)
    return status?.isInitialized || false
  }
  
  /**
   * Validate all skill initialization
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
          missingSkills.push(`${skillId} (not initialized)`)
        }
      }
    }
    
    if (missingSkills.length > 0) {
      throw new Error(`The following skills were not properly initialized: ${missingSkills.join(', ')}`)
    }
  }
  
  /**
   * Print initialization status
   */
  private printInitializationStatus(): void {
    console.log('\n📊 Skill initialization status:')
    console.log('='.repeat(50))
    
    const registry = SkillRegistry.getInstance()
    
    for (const [skillId, status] of this.initializationStatus.entries()) {
      const skill = registry.get(skillId)
      const skillStatus = skill?.getStatus()
      
      console.log(`🔹 ${skillId}:`)
      console.log(`   Registration status: ${skill ? '✅ Registered' : '❌ Not registered'}`)
      console.log(`   Initialization status: ${status.isInitialized ? '✅ Initialized' : '❌ Not initialized'}`)
      
      if (status.isInitialized && status.initializationTime) {
        console.log(`   Initialization time: ${new Date(status.initializationTime).toISOString()}`)
      }
      
      if (skillStatus) {
        console.log(`   Execution count: ${skillStatus.executionCount}`)
        console.log(`   Supported chains: ${skillStatus.supportedChains.length} chains`)
      }
      
      if (status.error) {
        console.log(`   Error: ${status.error}`)
      }
      
      if (status.dependencies.length > 0) {
        console.log(`   Dependencies: ${status.dependencies.join(', ')}`)
      }
      
      console.log()
    }
  }
  
  /**
   * Promise wrapper with timeout
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
   * Get skill instance
   */
  getSkill<T extends BaseSkill>(skillId: string): T | undefined {
    const registry = SkillRegistry.getInstance()
    return registry.get(skillId) as T | undefined
  }
  
  /**
   * Get all skills
   */
  getAllSkills(): BaseSkill[] {
    const registry = SkillRegistry.getInstance()
    return registry.getAll()
  }
  
  /**
   * Get initialization status
   */
  getInitializationStatus(): SkillInitializationStatus[] {
    return Array.from(this.initializationStatus.values())
  }
  
  /**
   * Check if all are initialized
   */
  isInitializedAll(): boolean {
    return this.isInitialized
  }
  
  /**
   * Reset skill manager state
   */
  reset(): void {
    this.isInitialized = false
    this.initializationPromise = null
    this.initializeStatusTracking()
    
    if (this.config.verbose) {
      console.log('🔄 Skill manager state has been reset')
    }
  }
}

/**
 * Get global skill manager instance
 */
let globalSkillManager: SkillManager | null = null

export function getSkillManager(config?: SkillManagerConfig): SkillManager {
  if (!globalSkillManager) {
    globalSkillManager = SkillManager.getInstance(config)
  }
  return globalSkillManager
}

/**
 * Create new skill manager instance
 */
export function createSkillManager(config: SkillManagerConfig): SkillManager {
  return SkillManager.getInstance(config)
}

/**
 * Convenience function to initialize all skills
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