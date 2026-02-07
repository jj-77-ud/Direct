/**
 * Direct Agent Type Definitions
 * 
 * This file defines AI Agent workflow, state management, and skill scheduling related types.
 */

import { type NomadIntent, type IntentResult, type IntentStep } from './intent'

// ==================== Agent State Types ====================

/**
 * Agent execution status
 */
export enum AgentStatus {
  IDLE = 'IDLE',                // Idle state
  PARSING_INTENT = 'PARSING_INTENT', // Parsing intent
  PLANNING = 'PLANNING',        // Planning execution steps
  EXECUTING = 'EXECUTING',      // Executing
  WAITING_FOR_CONFIRMATION = 'WAITING_FOR_CONFIRMATION', // Waiting for user confirmation
  COMPLETED = 'COMPLETED',      // Completed
  FAILED = 'FAILED',            // Failed
  CANCELLED = 'CANCELLED',      // Cancelled
}

/**
 * Agent execution context
 */
export interface AgentContext {
  // User information
  userAddress?: string          // User wallet address
  chainId: number               // Current chain ID
  
  // Asset information
  balances: Record<string, string> // Token balance mapping (token address -> balance)
  
  // Environment information
  gasPrice?: string             // Current gas price
  nonce?: number               // Current nonce
  
  // Session information
  sessionId: string            // Session ID
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: number
  }>
}

// ==================== Skill Related Types ====================

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
  success: boolean
  output?: any                  // Skill output
  error?: string               // Error message
  transactionHash?: string     // Transaction hash (if any)
  gasUsed?: string            // Gas used
  executionTime: number       // Execution time (milliseconds)
}

/**
 * Skill metadata
 */
export interface SkillMetadata {
  id: string                   // Skill ID (e.g., "ens", "lifi", "circle", "uniswap")
  name: string                 // Skill name
  description: string          // Skill description
  version: string              // Skill version
  author: string               // Author
  
  // Capability description
  capabilities: string[]       // Skill capability list
  requiredParams: string[]     // Required parameter list
  optionalParams: string[]     // Optional parameter list
  
  // Chain support
  supportedChains: number[]    // Supported chain ID list
  isAsync: boolean             // Whether execution is asynchronous
}

/**
 * Skill interface
 */
export interface ISkill {
  // Metadata
  metadata: SkillMetadata
  
  // Execution method
  execute(params: Record<string, any>, context: AgentContext): Promise<SkillExecutionResult>
  
  // Validation method
  validate(params: Record<string, any>): { valid: boolean; errors: string[] }
  
  // Estimation method
  estimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }>
}

// ==================== Workflow Related Types ====================

/**
 * Workflow step status
 */
export interface WorkflowStep {
  id: string                   // Step ID
  skillId: string              // Skill ID used
  description: string          // Step description
  params: Record<string, any>  // Step parameters
  dependsOn: string[]          // Dependent step ID list
  
  // Execution status
  status: 'pending' | 'ready' | 'executing' | 'completed' | 'failed'
  result?: SkillExecutionResult // Execution result
  startTime?: number           // Start time
  endTime?: number             // End time
}

/**
 * Workflow execution plan
 */
export interface WorkflowPlan {
  id: string                   // Plan ID
  intentId: string             // Corresponding intent ID
  steps: WorkflowStep[]        // Execution steps
  dependencies: Map<string, string[]> // Step dependency graph
  
  // Execution status
  status: 'created' | 'validating' | 'ready' | 'executing' | 'completed' | 'failed'
  currentStepIndex?: number    // Current execution step index
  results: Map<string, SkillExecutionResult> // Step execution result mapping
}

// ==================== Agent Core Types ====================

/**
 * Agent configuration
 */
export interface AgentConfig {
  // OpenAI configuration
  openaiApiKey?: string
  openaiModel?: string
  
  // Blockchain configuration
  defaultChainId: number
  rpcUrls: Record<number, string>
  
  // Skill configuration
  enabledSkills: string[]      // Enabled skill list
  skillConfigs: Record<string, any> // Skill-specific configuration
  
  // Execution configuration
  maxRetries: number           // Maximum retry count
  timeoutMs: number           // Timeout (milliseconds)
  gasLimitBuffer: number      // Gas limit buffer percentage
}

/**
 * Agent session
 */
export interface AgentSession {
  id: string                   // Session ID
  userId?: string              // User ID
  status: AgentStatus          // Current status
  context: AgentContext        // Execution context
  
  // Intent related
  currentIntent?: NomadIntent  // Current intent being processed
  intentHistory: NomadIntent[] // History intent list
  
  // Workflow related
  currentWorkflow?: WorkflowPlan // Current workflow
  workflowHistory: WorkflowPlan[] // History workflow list
  
  // Time information
  createdAt: number            // Creation time
  updatedAt: number            // Last update time
  completedAt?: number         // Completion time
}

// ==================== Event Types ====================

/**
 * Agent event type
 */
export enum AgentEventType {
  INTENT_RECEIVED = 'INTENT_RECEIVED',           // New intent received
  INTENT_PARSED = 'INTENT_PARSED',               // Intent parsing completed
  WORKFLOW_CREATED = 'WORKFLOW_CREATED',         // Workflow creation completed
  STEP_STARTED = 'STEP_STARTED',                 // Step execution started
  STEP_COMPLETED = 'STEP_COMPLETED',             // Step execution completed
  STEP_FAILED = 'STEP_FAILED',                   // Step execution failed
  WORKFLOW_COMPLETED = 'WORKFLOW_COMPLETED',     // Workflow execution completed
  WORKFLOW_FAILED = 'WORKFLOW_FAILED',           // Workflow execution failed
  USER_CONFIRMATION_REQUIRED = 'USER_CONFIRMATION_REQUIRED', // User confirmation required
  USER_CONFIRMED = 'USER_CONFIRMED',             // User confirmed
  USER_CANCELLED = 'USER_CANCELLED',             // User cancelled
  ERROR_OCCURRED = 'ERROR_OCCURRED',             // Error occurred
}

/**
 * Agent event
 */
export interface AgentEvent {
  type: AgentEventType
  sessionId: string
  timestamp: number
  data?: any                   // Event data
  metadata?: Record<string, any> // Metadata
}

// ==================== Utility Functions ====================

/**
 * Generate new session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate new workflow step ID
 */
export function generateStepId(skillId: string): string {
  return `step_${skillId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
}

/**
 * Check if workflow step is ready (all dependent steps are completed)
 */
export function isStepReady(step: WorkflowStep, completedSteps: Set<string>): boolean {
  return step.dependsOn.every(depId => completedSteps.has(depId))
}

/**
 * Create workflow dependency graph
 */
export function createDependencyGraph(steps: WorkflowStep[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  
  // Initialize graph
  steps.forEach(step => {
    graph.set(step.id, [])
  })
  
  // Add dependency edges
  steps.forEach(step => {
    step.dependsOn.forEach(depId => {
      const dependencies = graph.get(depId) || []
      dependencies.push(step.id)
      graph.set(depId, dependencies)
    })
  })
  
  return graph
}

/**
 * Validate workflow for cyclic dependencies
 */
export function hasCyclicDependency(steps: WorkflowStep[]): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  
  function dfs(stepId: string): boolean {
    if (recursionStack.has(stepId)) return true
    if (visited.has(stepId)) return false
    
    visited.add(stepId)
    recursionStack.add(stepId)
    
    const step = steps.find(s => s.id === stepId)
    if (step) {
      for (const depId of step.dependsOn) {
        if (dfs(depId)) return true
      }
    }
    
    recursionStack.delete(stepId)
    return false
  }
  
  for (const step of steps) {
    if (dfs(step.id)) return true
  }
  
  return false
}