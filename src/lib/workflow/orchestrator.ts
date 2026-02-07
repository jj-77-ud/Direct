/**
 * Direct Workflow Orchestrator
 * 
 * Key bridge connecting AI intent parsing and skill execution.
 * Responsible for converting structured intents into executable workflows and coordinating multiple skill scheduling.
 * 
 * Bounty requirement: Must demonstrate how AI Agent makes path decisions based on Quotes.
 */

import { type NomadIntent, IntentType, type IntentResult, type IntentStep } from '@/types/intent'
import { 
  type AgentContext, 
  type WorkflowPlan, 
  type WorkflowStep, 
  type SkillExecutionResult,
  AgentStatus,
  AgentEventType,
  type AgentEvent,
  generateStepId,
  createDependencyGraph,
  hasCyclicDependency,
  isStepReady
} from '@/types/agent'
import { getSkillRegistry } from '@/skills/base-skill'
import { getIntentParser } from '@/lib/ai/intent-parser'

// ==================== Workflow Orchestrator Configuration ====================

/**
 * Workflow orchestrator configuration
 */
export interface OrchestratorConfig {
  /**
   * Whether auto-execution is enabled
   */
  autoExecute?: boolean
  
  /**
   * Maximum retry count
   */
  maxRetries?: number
  
  /**
   * Step execution timeout (milliseconds)
   */
  stepTimeout?: number
  
  /**
   * Whether verbose logging is enabled
   */
  verbose?: boolean
  
  /**
   * Whether simulation mode is enabled (for testing)
   */
  simulationMode?: boolean
  
  /**
   * Skill configuration overrides
   */
  skillConfigs?: Record<string, any>
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OrchestratorConfig = {
  autoExecute: true,
  maxRetries: 3,
  stepTimeout: 30000, // 30 seconds
  verbose: false,
  simulationMode: false,
  skillConfigs: {},
}

// ==================== Workflow Orchestrator State ====================

/**
 * Workflow execution state
 */
export interface WorkflowExecution {
  id: string
  plan: WorkflowPlan
  context: AgentContext
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'
  currentStep?: string
  completedSteps: Set<string>
  failedSteps: Set<string>
  results: Map<string, SkillExecutionResult>
  startTime?: number
  endTime?: number
  error?: string
}

/**
 * Workflow orchestrator statistics
 */
export interface OrchestratorStats {
  totalWorkflows: number
  completedWorkflows: number
  failedWorkflows: number
  averageExecutionTime: number
  skillUsage: Record<string, number>
}

// ==================== Workflow Orchestrator ====================

/**
 * Nomad Arc Workflow Orchestrator
 * 
 * Core orchestrator class, responsible for:
 * 1. Converting intents into workflow plans
 * 2. Scheduling skill execution
 * 3. Managing execution state and dependencies
 * 4. Handling errors and retries
 * 5. Providing execution monitoring and statistics
 */
export class WorkflowOrchestrator {
  private config: OrchestratorConfig
  private executions: Map<string, WorkflowExecution> = new Map()
  private eventListeners: Map<AgentEventType, Array<(event: AgentEvent) => void>> = new Map()
  private stats: OrchestratorStats = {
    totalWorkflows: 0,
    completedWorkflows: 0,
    failedWorkflows: 0,
    averageExecutionTime: 0,
    skillUsage: {},
  }

  constructor(config: OrchestratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeEventSystem()
  }

  // ==================== Event System ====================

  /**
   * Initialize event system
   */
  private initializeEventSystem(): void {
    // Initialize listener arrays for all event types
    Object.values(AgentEventType).forEach(eventType => {
      this.eventListeners.set(eventType, [])
    })
  }

  /**
   * Emit event
   */
  private emitEvent(type: AgentEventType, data: { sessionId: string; data?: any }): void {
    const event: AgentEvent = {
      type,
      sessionId: data.sessionId,
      timestamp: Date.now(),
      data: data.data,
    }

    const listeners = this.eventListeners.get(type) || []
    listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error(`[Orchestrator] Event listener error:`, error)
      }
    })

    if (this.config.verbose) {
      console.log(`[Orchestrator] Event: ${type}`, event)
    }
  }

  /**
   * Add event listener
   */
  on(eventType: AgentEventType, listener: (event: AgentEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || []
    listeners.push(listener)
    this.eventListeners.set(eventType, listeners)
  }

  /**
   * Remove event listener
   */
  off(eventType: AgentEventType, listener: (event: AgentEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || []
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
    this.eventListeners.set(eventType, listeners)
  }

  // ==================== Core Workflow Methods ====================

  /**
   * Create intent execution workflow
   */
  async createWorkflow(intent: NomadIntent, context: AgentContext): Promise<WorkflowPlan> {
    const startTime = Date.now()
    
    try {
      this.emitEvent(AgentEventType.WORKFLOW_CREATED, {
        sessionId: context.sessionId,
        data: { intentId: intent.id, intentType: intent.type }
      })

      if (this.config.verbose) {
        console.log(`[Orchestrator] Creating workflow for intent: ${intent.id} (${intent.type})`)
      }

      // 1. Convert intent to workflow steps
      const steps = await this.intentToWorkflowSteps(intent, context)
      
      // 2. Validate workflow steps
      this.validateWorkflowSteps(steps)
      
      // 3. Create workflow plan
      const plan: WorkflowPlan = {
        id: `workflow_${intent.id}_${Date.now()}`,
        intentId: intent.id,
        steps,
        dependencies: createDependencyGraph(steps),
        status: 'created',
        currentStepIndex: 0,
        results: new Map(),
      }

      if (this.config.verbose) {
        console.log(`[Orchestrator] Workflow creation completed: ${plan.id}, step count: ${steps.length}`)
        steps.forEach((step, index) => {
          console.log(`  Step ${index + 1}: ${step.skillId} - ${step.description}`)
        })
      }

      // 4. If auto-execution enabled, start execution immediately
      if (this.config.autoExecute) {
        await this.executeWorkflow(plan, context)
      }

      return plan

    } catch (error) {
      console.error(`[Orchestrator] Failed to create workflow:`, error)
      throw new Error(`Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(plan: WorkflowPlan, context: AgentContext): Promise<WorkflowExecution> {
    const executionId = `exec_${plan.id}_${Date.now()}`
    
    const execution: WorkflowExecution = {
      id: executionId,
      plan,
      context,
      status: 'pending',
      completedSteps: new Set(),
      failedSteps: new Set(),
      results: new Map(),
      startTime: Date.now(),
    }

    this.executions.set(executionId, execution)
    this.stats.totalWorkflows++

    // Start asynchronous execution
    this.executeWorkflowAsync(executionId).catch(error => {
      console.error(`[Orchestrator] Workflow execution failed: ${executionId}`, error)
    })

    return execution
  }

  /**
   * Asynchronously execute workflow (internal method)
   */
  private async executeWorkflowAsync(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId)
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    execution.status = 'executing'
    execution.plan.status = 'executing'

    try {
      // Get ready steps and execute
      let readySteps = this.getReadySteps(execution)
      
      while (readySteps.length > 0) {
        // Execute all ready steps in parallel
        const stepPromises = readySteps.map(step => 
          this.executeStep(step, execution)
        )
        
        const results = await Promise.allSettled(stepPromises)
        
        // Process step execution results
        results.forEach((result: PromiseSettledResult<SkillExecutionResult>, index: number) => {
          const step = readySteps[index]
          if (result.status === 'fulfilled') {
            this.handleStepSuccess(step, result.value, execution)
          } else {
            this.handleStepFailure(step, result.reason, execution)
          }
        })

        // Check if workflow is completed
        if (this.isWorkflowCompleted(execution)) {
          execution.status = 'completed'
          execution.plan.status = 'completed'
          execution.endTime = Date.now()
          this.stats.completedWorkflows++
          
          // Update average execution time statistics
          const executionTime = execution.endTime - (execution.startTime || Date.now())
          this.updateStats(executionTime, execution)
          
          this.emitEvent(AgentEventType.WORKFLOW_COMPLETED, {
            sessionId: execution.context.sessionId,
            data: { 
              executionId, 
              planId: execution.plan.id,
              executionTime 
            }
          })
          
          if (this.config.verbose) {
            console.log(`[Orchestrator] Workflow execution completed: ${executionId}`)
          }
          return
        }

        // Get next batch of ready steps
        const nextReadySteps = this.getReadySteps(execution)
        if (nextReadySteps.length === 0 && !this.isWorkflowCompleted(execution)) {
          // Deadlock detection: no ready steps but workflow not completed
          execution.status = 'failed'
          execution.plan.status = 'failed'
          execution.error = 'Workflow deadlock detected: no ready steps but workflow not completed'
          execution.endTime = Date.now()
          this.stats.failedWorkflows++
          
          this.emitEvent(AgentEventType.WORKFLOW_FAILED, {
            sessionId: execution.context.sessionId,
            data: { 
              executionId, 
              planId: execution.plan.id,
              error: execution.error 
            }
          })
          
          console.error(`[Orchestrator] Workflow deadlock: ${executionId}`)
          return
        }
        
        readySteps = nextReadySteps
      }

    } catch (error) {
      execution.status = 'failed'
      execution.plan.status = 'failed'
      execution.error = error instanceof Error ? error.message : String(error)
      execution.endTime = Date.now()
      this.stats.failedWorkflows++
      
      this.emitEvent(AgentEventType.WORKFLOW_FAILED, {
        sessionId: execution.context.sessionId,
        data: { 
          executionId, 
          planId: execution.plan.id,
          error: execution.error 
        }
      })
      
      console.error(`[Orchestrator] Workflow execution exception: ${executionId}`, error)
    }
  }

  /**
   * Execute single step
   */
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<SkillExecutionResult> {
    const startTime = Date.now()
    
    try {
      this.emitEvent(AgentEventType.STEP_STARTED, {
        sessionId: execution.context.sessionId,
        data: { 
          executionId: execution.id,
          stepId: step.id,
          skillId: step.skillId 
        }
      })

      if (this.config.verbose) {
        console.log(`[Orchestrator] Executing step: ${step.id} (${step.skillId})`)
      }

      // Get skill instance
      const skillRegistry = getSkillRegistry()
      const skill = skillRegistry.get(step.skillId)
      
      if (!skill) {
        throw new Error(`Skill not found: ${step.skillId}`)
      }

      // Check chain support
      if (!skill.isChainSupported(execution.context.chainId)) {
        throw new Error(`Skill ${step.skillId} does not support chain ${execution.context.chainId}`)
      }

      // Execute skill
      let result: SkillExecutionResult
      
      if (this.config.simulationMode) {
        // Simulation execution mode
        result = await this.simulateSkillExecution(step, execution)
      } else {
        // Real execution
        result = await skill.execute(step.params, execution.context)
      }

      const executionTime = Date.now() - startTime
      result.executionTime = executionTime

      // Update skill usage statistics
      this.stats.skillUsage[step.skillId] = (this.stats.skillUsage[step.skillId] || 0) + 1

      this.emitEvent(AgentEventType.STEP_COMPLETED, {
        sessionId: execution.context.sessionId,
        data: { 
          executionId: execution.id,
          stepId: step.id,
          skillId: step.skillId,
          success: result.success,
          executionTime 
        }
      })

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      
      this.emitEvent(AgentEventType.STEP_FAILED, {
        sessionId: execution.context.sessionId,
        data: { 
          executionId: execution.id,
          stepId: step.id,
          skillId: step.skillId,
          error: error instanceof Error ? error.message : String(error),
          executionTime 
        }
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      }
    }
  }

  // ==================== Workflow Engine Helper Methods ====================

  /**
   * Get ready steps
   */
  private getReadySteps(execution: WorkflowExecution): WorkflowStep[] {
    return execution.plan.steps.filter(step => {
      // Step status must be pending or ready
      if (step.status !== 'pending' && step.status !== 'ready') {
        return false
      }
      
      // Check if dependencies are satisfied
      return isStepReady(step, execution.completedSteps)
    })
  }

  /**
   * Handle step success
   */
  private handleStepSuccess(step: WorkflowStep, result: SkillExecutionResult, execution: WorkflowExecution): void {
    step.status = 'completed'
    step.result = result
    execution.completedSteps.add(step.id)
    execution.results.set(step.id, result)
    
    if (this.config.verbose) {
      console.log(`[Orchestrator] Step completed: ${step.id}, success: ${result.success}`)
    }
  }

  /**
   * Handle step failure
   */
  private handleStepFailure(step: WorkflowStep, error: any, execution: WorkflowExecution): void {
    step.status = 'failed'
    step.result = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: 0,
    }
    execution.failedSteps.add(step.id)
    
    if (this.config.verbose) {
      console.log(`[Orchestrator] Step failed: ${step.id}, error: ${error}`)
    }
  }

  /**
   * Check if workflow is completed
   */
  private isWorkflowCompleted(execution: WorkflowExecution): boolean {
    const totalSteps = execution.plan.steps.length
    const completedSteps = execution.completedSteps.size
    const failedSteps = execution.failedSteps.size
    
    // All steps are either completed or failed
    return (completedSteps + failedSteps) === totalSteps
  }

  /**
   * Update statistics
   */
  private updateStats(executionTime: number, execution: WorkflowExecution): void {
    // Update average execution time
    const totalCompleted = this.stats.completedWorkflows
    if (totalCompleted > 0) {
      this.stats.averageExecutionTime = 
        (this.stats.averageExecutionTime * (totalCompleted - 1) + executionTime) / totalCompleted
    } else {
      this.stats.averageExecutionTime = executionTime
    }
  }

  /**
   * Validate workflow steps
   */
  private validateWorkflowSteps(steps: WorkflowStep[]): void {
    // Check for cyclic dependencies
    if (hasCyclicDependency(steps)) {
      throw new Error('Workflow has cyclic dependency')
    }
    
    // Check if skills exist
    const skillRegistry = getSkillRegistry()
    steps.forEach(step => {
      if (!skillRegistry.has(step.skillId)) {
        throw new Error(`Skill not found: ${step.skillId}`)
      }
    })
  }

  /**
   * Simulate skill execution (removed, project rules prohibit using mock data)
   * When simulationMode: true, directly throw error
   */
  private async simulateSkillExecution(step: WorkflowStep, execution: WorkflowExecution): Promise<SkillExecutionResult> {
    throw new Error(`Simulation execution disabled. Skill ${step.skillId} requires real implementation. Please ensure the skill is properly initialized and configured with real SDK.`)
  }

  // ==================== Intent to Workflow Conversion ====================

  /**
   * Convert intent to workflow steps
   */
  private async intentToWorkflowSteps(intent: NomadIntent, context: AgentContext): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = []
    
    switch (intent.type) {
      case IntentType.RESOLVE_ENS:
        steps.push(this.createEnsResolveStep(intent, context))
        break
        
      case IntentType.REVERSE_RESOLVE:
        steps.push(this.createEnsReverseResolveStep(intent, context))
        break
        
      case IntentType.SWAP:
        steps.push(...await this.createSwapSteps(intent, context))
        break
        
      case IntentType.BRIDGE:
        steps.push(...await this.createBridgeSteps(intent, context))
        break
        
      case IntentType.CCTP_TRANSFER:
        steps.push(...await this.createCctpSteps(intent, context))
        break
        
      case IntentType.COMPLEX:
        steps.push(...await this.createComplexSteps(intent, context))
        break
        
      default:
        throw new Error(`Unsupported intent type: ${intent.type}`)
    }
    
    return steps
  }

  /**
   * Create ENS resolution step
   */
  private createEnsResolveStep(intent: NomadIntent, context: AgentContext): WorkflowStep {
    const params = intent.params as any
    
    return {
      id: generateStepId('ens'),
      skillId: 'ens',
      description: `Resolve ENS domain: ${params.domain}`,
      params: {
        action: 'resolve',
        domain: params.domain,
        chainId: intent.chainId,
      },
      dependsOn: [],
      status: 'pending',
    }
  }

  /**
   * Create ENS reverse resolution step
   */
  private createEnsReverseResolveStep(intent: NomadIntent, context: AgentContext): WorkflowStep {
    const params = intent.params as any
    
    return {
      id: generateStepId('ens'),
      skillId: 'ens',
      description: `Reverse resolve address: ${params.address}`,
      params: {
        action: 'reverse',
        address: params.address,
        chainId: intent.chainId,
      },
      dependsOn: [],
      status: 'pending',
    }
  }

  /**
   * Create swap steps
   */
  private async createSwapSteps(intent: NomadIntent, context: AgentContext): Promise<WorkflowStep[]> {
    const params = intent.params as any
    const steps: WorkflowStep[] = []
    
    // Step 1: Get swap quote
    const quoteStep: WorkflowStep = {
      id: generateStepId('uniswap'),
      skillId: 'uniswap',
      description: `Get ${params.fromToken.symbol} -> ${params.toToken.symbol} swap quote`,
      params: {
        action: 'quote',
        fromToken: params.fromToken,
        toToken: params.toToken,
        amountIn: params.amountIn,
        slippage: params.slippage || 0.5,
        chainId: intent.chainId,
      },
      dependsOn: [],
      status: 'pending',
    }
    
    // Step 2: Execute swap (depends on quote step)
    const executeStep: WorkflowStep = {
      id: generateStepId('uniswap'),
      skillId: 'uniswap',
      description: `Execute ${params.fromToken.symbol} -> ${params.toToken.symbol} swap`,
      params: {
        action: 'execute',
        quoteId: '{{quote_step.output.quoteId}}',
        chainId: intent.chainId,
      },
      dependsOn: [quoteStep.id],
      status: 'pending',
    }
    
    steps.push(quoteStep, executeStep)
    return steps
  }

  /**
   * Create cross-chain bridge steps
   */
  private async createBridgeSteps(intent: NomadIntent, context: AgentContext): Promise<WorkflowStep[]> {
    const params = intent.params as any
    const steps: WorkflowStep[] = []
    
    // Step 1: Get cross-chain quote (core bounty requirement)
    const quoteStep: WorkflowStep = {
      id: generateStepId('lifi'),
      skillId: 'lifi',
      description: `Get ${params.token.symbol} cross-chain quote from chain ${params.fromChainId} to chain ${params.toChainId}`,
      params: {
        action: 'quote',
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        fromTokenAddress: params.token.address,
        toTokenAddress: params.token.address,
        amount: params.amount.formatted,
        slippage: 0.5,
        fromAddress: context.userAddress,
        toAddress: params.recipient || context.userAddress,
      },
      dependsOn: [],
      status: 'pending',
    }
    
    // Step 2: Execute cross-chain (depends on quote step)
    const executeStep: WorkflowStep = {
      id: generateStepId('lifi'),
      skillId: 'lifi',
      description: `Execute ${params.token.symbol} cross-chain transfer`,
      params: {
        action: 'execute',
        quoteId: '{{quote_step.output.quoteId}}',
        chainId: params.fromChainId,
      },
      dependsOn: [quoteStep.id],
      status: 'pending',
    }
    
    steps.push(quoteStep, executeStep)
    return steps
  }

  /**
   * Create CCTP cross-chain steps
   */
  private async createCctpSteps(intent: NomadIntent, context: AgentContext): Promise<WorkflowStep[]> {
    const params = intent.params as any
    const steps: WorkflowStep[] = []
    
    // Step 1: Get CCTP quote
    const quoteStep: WorkflowStep = {
      id: generateStepId('circle'),
      skillId: 'circle',
      description: `Get USDC CCTP cross-chain quote from chain ${params.fromChainId} to chain ${params.toChainId}`,
      params: {
        action: 'quote',
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        amount: params.amount,
        recipient: params.recipient || context.userAddress,
      },
      dependsOn: [],
      status: 'pending',
    }
    
    // Step 2: Execute CCTP cross-chain (depends on quote step)
    const executeStep: WorkflowStep = {
      id: generateStepId('circle'),
      skillId: 'circle',
      description: `Execute USDC CCTP cross-chain transfer`,
      params: {
        action: 'execute',
        quoteId: '{{quote_step.output.quoteId}}',
        chainId: params.fromChainId,
      },
      dependsOn: [quoteStep.id],
      status: 'pending',
    }
    
    steps.push(quoteStep, executeStep)
    return steps
  }

  /**
   * Create complex intent steps
   */
  private async createComplexSteps(intent: NomadIntent, context: AgentContext): Promise<WorkflowStep[]> {
    // Complex intents require further AI decomposition
    // Return a simple placeholder step here
    const steps: WorkflowStep[] = []
    
    const complexStep: WorkflowStep = {
      id: generateStepId('complex'),
      skillId: 'ens', // Use ENS as placeholder
      description: `Process complex intent: ${intent.description}`,
      params: {
        action: 'resolve',
        domain: 'placeholder.eth',
        chainId: intent.chainId,
      },
      dependsOn: [],
      status: 'pending',
    }
    
    steps.push(complexStep)
    return steps
  }

  // ==================== Public API ====================

  /**
   * Get workflow execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Get all executions
   */
  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values())
  }

  /**
   * Get statistics
   */
  getStats(): OrchestratorStats {
    return { ...this.stats }
  }

  /**
   * Cancel workflow execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId)
    if (!execution) {
      return false
    }
    
    execution.status = 'cancelled'
    execution.endTime = Date.now()
    execution.error = 'Cancelled by user'
    
    this.emitEvent(AgentEventType.USER_CANCELLED, {
      sessionId: execution.context.sessionId,
      data: { executionId }
    })
    
    return true
  }

  /**
   * Clear all execution records
   */
  clearExecutions(): void {
    this.executions.clear()
  }
}

// ==================== Export Utility Functions ====================

/**
 * Get global workflow orchestrator instance
 */
let globalOrchestrator: WorkflowOrchestrator | null = null

export function getWorkflowOrchestrator(config?: OrchestratorConfig): WorkflowOrchestrator {
  if (!globalOrchestrator) {
    globalOrchestrator = new WorkflowOrchestrator(config)
  }
  return globalOrchestrator
}

/**
 * Create new workflow orchestrator instance
 */
export function createWorkflowOrchestrator(config: OrchestratorConfig): WorkflowOrchestrator {
  return new WorkflowOrchestrator(config)
}