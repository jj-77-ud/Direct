/**
 * ENS Skill Implementation
 * 
 * Encapsulates ENS (Ethereum Name Service) domain resolution logic.
 * Supports forward resolution (domain -> address) and reverse resolution (address -> domain).
 */

import { BaseSkill, createAndRegisterSkill } from './base-skill'
import { type SkillMetadata, type AgentContext, type SkillExecutionResult } from '@/types/agent'
import { type Address } from '@/types/blockchain'
import { ChainId } from '@/constants/chains'

// ==================== Skill Configuration ====================

/**
 * ENS Skill Configuration
 */
export interface EnsSkillConfig {
  // ENS registry address (may differ across chains)
  ensRegistryAddress?: Address
  
  // Resolver configuration
  defaultResolver?: Address
  
  // Cache configuration
  cacheTtl?: number // Cache validity period (milliseconds)
  
  // Retry configuration
  maxRetries?: number
  retryDelay?: number
}

// ==================== Skill Implementation ====================

/**
 * ENS Skill Class
 */
export class EnsSkill extends BaseSkill {
  // Skill metadata
  readonly metadata: SkillMetadata = {
    id: 'ens',
    name: 'ENS Domain Resolver',
    description: 'Resolve mapping relationships between ENS domains and addresses',
    version: '1.0.0',
    author: 'Nomad Arc Team',
    
    capabilities: [
      'resolve_ens',      // Resolve ENS domain
      'reverse_resolve',  // Reverse resolve address
      'check_availability', // Check domain availability
    ],
    
    requiredParams: ['action'], // action: 'resolve' | 'reverse' | 'check'
    optionalParams: ['domain', 'address', 'chainId'],
    
    supportedChains: [
      ChainId.ETHEREUM,      // Ethereum mainnet
      ChainId.SEPOLIA,       // Sepolia testnet
      ChainId.ARBITRUM,      // Arbitrum mainnet
      ChainId.ARBITRUM_SEPOLIA, // Arbitrum Sepolia
      ChainId.BASE,          // Base mainnet
      ChainId.BASE_SEPOLIA,  // Base Sepolia
      ChainId.OPTIMISM,      // Optimism mainnet
      ChainId.POLYGON,       // Polygon mainnet
    ],
    
    isAsync: true,
  }
  
  // Skill-specific configuration
  private ensConfig: Required<EnsSkillConfig>
  
  // Cache
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  
  /**
   * Constructor
   */
  constructor(config: EnsSkillConfig = {}) {
    super(config)
    
    this.ensConfig = {
      ensRegistryAddress: config.ensRegistryAddress || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // Mainnet default
      defaultResolver: config.defaultResolver || '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      cacheTtl: config.cacheTtl || 5 * 60 * 1000, // 5 minutes
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    }
  }
  
  // ==================== Abstract Method Implementation ====================
  
  /**
   * Initialize ENS Skill
   */
  protected async onInitialize(): Promise<void> {
    console.log('Initializing ENS skill...')
    
    // Here we can initialize ENSjs or other ENS SDK
    // Since we don't have real SDK information yet, only framework initialization here
    
    // Clear cache
    this.cache.clear()
    
    console.log('ENS skill initialized (framework only)')
  }
  
  /**
   * Execute ENS Operation
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
   * Custom Parameter Validation
   */
  protected onValidate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const { action } = params
    
    // Validate action parameter
    if (!action) {
      errors.push('Missing required parameter: action')
    } else if (!['resolve', 'reverse', 'check'].includes(action)) {
      errors.push(`Invalid action: ${action}. Must be one of: resolve, reverse, check`)
    }
    
    // Validate other parameters based on action
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
   * Estimate Execution Cost
   */
  protected async onEstimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }> {
    // ENS resolution is typically read-only operation with minimal gas consumption
    return {
      gasEstimate: '0', // Read-only operation, no gas consumption
      timeEstimate: 2000, // 2-second estimate
      costEstimate: 'Free (read-only)',
    }
  }
  
  // ==================== Concrete Operation Methods ====================
  
  /**
   * Resolve ENS Domain
   */
  private async resolveEns(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { domain, chainId = context.chainId } = params
    
    // Check cache
    const cacheKey = `resolve:${domain}:${chainId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }
    
    console.log(`Resolving ENS domain: ${domain} on chain ${chainId}`)
    
    try {
      // Use real ENS SDK implementation
      const { resolveEnsDomain } = await import('@/lib/ens')
      const address = await resolveEnsDomain(domain, chainId)
      
      const result = {
        domain,
        chainId,
        address: address || '0x0000000000000000000000000000000000000000' as Address,
        resolver: this.ensConfig.defaultResolver,
        resolvedAt: Date.now(),
        isResolved: !!address,
        note: address ? 'Domain resolved successfully' : 'Domain not resolved or does not exist',
        implementationRequired: false, // Marked as implemented
      }
      
      // Store in cache (if resolution successful)
      if (address) {
        this.setCache(cacheKey, result)
      }
      
      // Log execution
      this.logExecution('resolve', params, context, result)
      
      return result
    } catch (error) {
      console.error(`Failed to resolve ENS domain ${domain}:`, error)
      
      // Return error information
      const errorResult = {
        domain,
        chainId,
        address: '0x0000000000000000000000000000000000000000' as Address,
        resolver: this.ensConfig.defaultResolver,
        resolvedAt: Date.now(),
        isResolved: false,
        note: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        implementationRequired: false,
        error: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }
      
      this.logExecution('resolve', params, context, errorResult)
      return errorResult
    }
  }
  
  /**
   * Reverse Resolve Address
   */
  private async reverseResolve(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { address, chainId = context.chainId } = params
    
    // Check cache
    const cacheKey = `reverse:${address}:${chainId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }
    
    console.log(`Reverse resolving address: ${address} on chain ${chainId}`)
    
    try {
      // Use real ENS SDK implementation
      const { reverseResolveAddress } = await import('@/lib/ens')
      const domain = await reverseResolveAddress(address, chainId)
      
      const result = {
        address,
        chainId,
        domain: domain || 'No domain set',
        resolver: this.ensConfig.defaultResolver,
        resolvedAt: Date.now(),
        isResolved: !!domain,
        note: domain ? 'Address reverse resolved successfully' : 'Address has no ENS domain set',
        implementationRequired: false, // Marked as implemented
      }
      
      // Store in cache (if resolution successful)
      if (domain) {
        this.setCache(cacheKey, result)
      }
      
      // Log execution
      this.logExecution('reverse_resolve', params, context, result)
      
      return result
    } catch (error) {
      console.error(`Failed to reverse resolve address ${address}:`, error)
      
      // Return error information
      const errorResult = {
        address,
        chainId,
        domain: 'Resolution failed',
        resolver: this.ensConfig.defaultResolver,
        resolvedAt: Date.now(),
        isResolved: false,
        note: `Reverse resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        implementationRequired: false,
        error: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }
      
      this.logExecution('reverse_resolve', params, context, errorResult)
      return errorResult
    }
  }
  
  /**
   * Check Domain Availability
   */
  private async checkAvailability(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { domain, chainId = context.chainId } = params
    
    console.log(`Checking domain availability: ${domain} on chain ${chainId}`)
    
    try {
      // Use real ENS SDK implementation
      const { checkEnsAvailability, getEnsRecords } = await import('@/lib/ens')
      const isAvailable = await checkEnsAvailability(domain, chainId)
      
      // Try to get more information
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
          // Ignore record retrieval errors
          console.log(`Could not get additional records for ${domain}:`, recordError)
        }
      }
      
      const result = {
        domain,
        chainId,
        isAvailable,
        price: isAvailable ? 'Registration fee required' : 'Not available',
        expiresAt: null, // ENSjs requires additional call to get expiration time
        checkedAt: Date.now(),
        note: isAvailable ? 'Domain available' : 'Domain already registered',
        implementationRequired: false, // Marked as implemented
        ...additionalInfo,
      }
      
      // Log execution
      this.logExecution('check_availability', params, context, result)
      
      return result
    } catch (error) {
      console.error(`Failed to check domain availability for ${domain}:`, error)
      
      // Return error information
      const errorResult = {
        domain,
        chainId,
        isAvailable: false,
        price: 'Check failed',
        expiresAt: null,
        checkedAt: Date.now(),
        note: `Availability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        implementationRequired: false,
        error: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }
      
      this.logExecution('check_availability', params, context, errorResult)
      return errorResult
    }
  }
  
  // ==================== Utility Methods ====================
  
  /**
   * Validate Domain Format
   */
  private isValidDomain(domain: string): boolean {
    // Simple ENS domain validation
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.eth$/i.test(domain)
  }
  
  /**
   * Validate Address Format
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  
  /**
   * Get Data from Cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ensConfig.cacheTtl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  /**
   * Set Cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }
  
  
  /**
   * Reset Skill
   */
  protected onReset(): void {
    this.cache.clear()
  }
}

// ==================== Export and Registration ====================

/**
 * Create and Register ENS Skill Instance
 */
export function initializeEnsSkill(config: EnsSkillConfig = {}): EnsSkill {
  return createAndRegisterSkill(EnsSkill, config)
}

/**
 * Get ENS Skill Instance
 */
export async function getEnsSkill(): Promise<EnsSkill | undefined> {
  try {
    // Use ES module dynamic import to avoid circular dependency
    const { getSkillRegistry } = await import('./base-skill')
    const registry = getSkillRegistry()
    return registry.get('ens') as EnsSkill | undefined
  } catch (error) {
    console.error('Failed to get ENS skill:', error)
    return undefined
  }
}