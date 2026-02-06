/**
 * Circle CCTP Skill Implementation
 *
 * Encapsulates Circle Cross-Chain Transfer Protocol (CCTP) cross-chain logic.
 * Specifically designed for secure, fast cross-chain transfer of USDC.
 *
 * Bounty Requirement: Must implement USDC cross-chain transfer using CCTP.
 *
 * Uses official @circle-fin/bridge-kit and @circle-fin/adapter-viem-v2 for real integration.
 */

import { BaseSkill, createAndRegisterSkill } from './base-skill'
import { type SkillMetadata, type AgentContext, type SkillExecutionResult } from '@/types/agent'
import { type Address } from '@/types/blockchain'
import { ChainId } from '@/constants/chains'
import {
  getCircleCCTPMessageTransmitterAddress,
  getCircleCCTPTokenMessengerAddress,
  getUSDCAddress,
  ContractName
} from '@/constants/addresses'
import { parseUnits, formatUnits, http, createPublicClient } from 'viem'
import { arbitrumSepolia, baseSepolia, sepolia } from 'viem/chains'

// Circle Bridge Kit imports
import { BridgeKit, type BridgeChainIdentifier } from '@circle-fin/bridge-kit'
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'

// ==================== Skill Configuration ====================

/**
 * Circle CCTP Skill Configuration
 */
export interface CircleSkillConfig {
  // Circle CCTP contract addresses (usually read from addresses.ts)
  messageTransmitterAddress?: Address
  tokenMessengerAddress?: Address
  
  // Cross-chain configuration
  supportedChains?: number[] // List of supported chains
  defaultGasLimit?: string   // Default gas limit
  
  // Retry configuration
  maxRetries?: number
  retryDelay?: number
  
  // Debug configuration
  debugMode?: boolean

  // Bridge Kit configuration
  privateKey?: `0x${string}` // Optional, private key for testing (production should get from wallet)
}

// Internal type for Required configuration, where privateKey can be undefined
type RequiredCircleSkillConfig = Omit<Required<CircleSkillConfig>, 'privateKey'> & {
  privateKey?: `0x${string}`
}

// ==================== Type Definitions ====================

/**
 * CCTP Cross-Chain Parameters
 */
export interface CCTPTransferParams {
  fromChainId: number           // Source chain ID
  toChainId: number             // Destination chain ID
  amount: string                // USDC amount (string format)
  recipient?: Address           // Recipient address (optional, defaults to current address)
  deadline?: number             // Transaction deadline (timestamp)
}

/**
 * CCTP Cross-Chain Status
 */
export enum CCTPTransferStatus {
  PENDING = 'PENDING',          // Waiting to start
  INITIATED = 'INITIATED',      // Source chain transaction sent
  MESSAGE_SENT = 'MESSAGE_SENT', // Cross-chain message sent
  COMPLETED = 'COMPLETED',      // Destination chain transaction completed
  FAILED = 'FAILED',            // Failed
}

/**
 * CCTP Cross-Chain Result
 */
export interface CCTPTransferResult {
  status: CCTPTransferStatus
  fromChainId: number
  toChainId: number
  amount: string
  recipient: Address
  
  // Transaction information
  sourceTxHash?: string         // Source chain transaction hash
  messageHash?: string          // Cross-chain message hash
  destinationTxHash?: string    // Destination chain transaction hash
  
  // Time information
  initiatedAt?: number          // Start time
  messageSentAt?: number        // Message send time
  completedAt?: number          // Completion time
  
  // Error information
  error?: string
  retryCount?: number
  
  // Implementation status information
  note?: string                 // Implementation note
  implementationRequired?: boolean // Whether real implementation is needed
}

// ==================== Chain ID Mapping ====================

/**
 * Map project chain IDs to Bridge Kit chain identifiers
 */
function mapChainIdToBridgeChain(chainId: number): BridgeChainIdentifier {
  switch (chainId) {
    case ChainId.ARBITRUM_SEPOLIA:
      return 'Arbitrum_Sepolia' as BridgeChainIdentifier
    case ChainId.BASE_SEPOLIA:
      return 'Base_Sepolia' as BridgeChainIdentifier
    case ChainId.SEPOLIA:
      return 'Ethereum_Sepolia' as BridgeChainIdentifier
    case ChainId.ETHEREUM:
      return 'Ethereum' as BridgeChainIdentifier
    case ChainId.ARBITRUM:
      return 'Arbitrum' as BridgeChainIdentifier
    case ChainId.BASE:
      return 'Base' as BridgeChainIdentifier
    case ChainId.OPTIMISM:
      return 'Optimism' as BridgeChainIdentifier
    case ChainId.POLYGON:
      return 'Polygon' as BridgeChainIdentifier
    case ChainId.AVALANCHE:
      return 'Avalanche' as BridgeChainIdentifier
    case ChainId.BSC:
      return 'BSC' as BridgeChainIdentifier
    case ChainId.CIRCLE_ARC_TESTNET:
      return 'Arc_Testnet' as BridgeChainIdentifier
    default:
      throw new Error(`Unsupported chain ID for Bridge Kit: ${chainId}`)
  }
}

// ==================== Skill Implementation ====================

/**
 * Circle CCTP Skill Class
 */
export class CircleSkill extends BaseSkill {
  // Skill metadata
  readonly metadata: SkillMetadata = {
    id: 'circle',
    name: 'Circle CCTP Cross-Chain Transfer',
    description: 'Secure cross-chain transfer of USDC using Circle CCTP protocol',
    version: '1.0.0',
    author: 'Nomad Arc Team',
    
    capabilities: [
      'cctp_transfer',          // CCTP cross-chain transfer
      'cctp_status_check',      // Check cross-chain status
      'cctp_estimate',          // Estimate cross-chain cost
    ],
    
    requiredParams: ['fromChainId', 'toChainId', 'amount'],
    optionalParams: ['recipient', 'deadline'],
    
    supportedChains: [
      ChainId.ARBITRUM_SEPOLIA,  // Arbitrum Sepolia (bounty requirement)
      ChainId.BASE_SEPOLIA,      // Base Sepolia (bounty requirement)
      // Note: CCTP also supports other chains, but bounty requires these testnets
    ],
    
    isAsync: true,
  }
  
  // Skill-specific configuration
  private circleConfig: RequiredCircleSkillConfig
  
  // Bridge Kit instance
  private bridgeKit: BridgeKit | null = null
  
  // Cross-chain status tracking
  private transfers: Map<string, CCTPTransferResult> = new Map()
  
  /**
   * Constructor
   */
  constructor(config: CircleSkillConfig = {}) {
    super(config)
    
    this.circleConfig = {
      messageTransmitterAddress: config.messageTransmitterAddress || '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275', // Default testnet address
      tokenMessengerAddress: config.tokenMessengerAddress || '0xb43db544E2c27092c107639Ad201b3dEfAbcF192', // Default testnet address
      supportedChains: config.supportedChains || [ChainId.ARBITRUM_SEPOLIA, ChainId.BASE_SEPOLIA],
      defaultGasLimit: config.defaultGasLimit || '500000',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 2000,
      debugMode: config.debugMode || false,
      privateKey: config.privateKey,
    }
  }
  
  // ==================== Abstract Method Implementation ====================
  
  /**
   * Initialize Circle CCTP Skill
   */
  protected async onInitialize(): Promise<void> {
    console.log('Initializing Circle CCTP skill with Bridge Kit...')
    
    try {
      // Initialize Bridge Kit
      await this.initializeBridgeKit()
      
      // Validate configured contract addresses
      this.validateContractAddresses()
      
      // Clear status tracking
      this.transfers.clear()
      
      console.log('✅ Circle CCTP skill initialized successfully')
      console.log('📋 Supported chains:', this.circleConfig.supportedChains)
      console.log('📋 Contract addresses:', {
        messageTransmitter: this.circleConfig.messageTransmitterAddress,
        tokenMessenger: this.circleConfig.tokenMessengerAddress,
      })
      console.log('📋 Bridge Kit status:', this.bridgeKit ? 'Initialized' : 'Not initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Circle CCTP skill:', error)
      console.log('⚠️  Continuing with framework-only mode')
    }
  }
  
  /**
   * Initialize Bridge Kit
   */
  private async initializeBridgeKit(): Promise<void> {
    try {
      // Create Bridge Kit instance
      this.bridgeKit = new BridgeKit()
      
      // If private key is configured, create adapter (for testing only)
      if (this.circleConfig.privateKey) {
        console.log('🔑 Using private key from config for Bridge Kit adapter')
        // Note: Actual production environment should get adapter from wallet provider
      } else {
        console.log('⚠️  No private key provided, Bridge Kit will require adapter from context')
      }
      
      console.log('✅ Bridge Kit initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Bridge Kit:', error)
      throw error
    }
  }
  
  /**
   * Execute Circle CCTP Operation
   */
  protected async onExecute(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { action = 'transfer' } = params
    
    switch (action) {
      case 'transfer':
        return await this.executeCCTPTransfer(params, context)
      
      case 'check_status':
        return await this.checkTransferStatus(params, context)
      
      case 'estimate':
        return await this.estimateTransfer(params, context)
      
      default:
        throw new Error(`Unsupported Circle CCTP action: ${action}`)
    }
  }
  
  /**
   * Custom Parameter Validation
   */
  protected onValidate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const { action = 'transfer' } = params
    
    // General validation
    if (action === 'transfer') {
      // Validate chain IDs
      if (!params.fromChainId) {
        errors.push('Missing required parameter: fromChainId')
      } else if (!this.circleConfig.supportedChains.includes(Number(params.fromChainId))) {
        errors.push(`Unsupported source chain: ${params.fromChainId}`)
      }
      
      if (!params.toChainId) {
        errors.push('Missing required parameter: toChainId')
      } else if (!this.circleConfig.supportedChains.includes(Number(params.toChainId))) {
        errors.push(`Unsupported destination chain: ${params.toChainId}`)
      }
      
      if (params.fromChainId && params.toChainId && params.fromChainId === params.toChainId) {
        errors.push('Source and destination chains must be different')
      }
      
      // Validate amount
      if (!params.amount) {
        errors.push('Missing required parameter: amount')
      } else if (!this.isValidAmount(params.amount)) {
        errors.push(`Invalid amount format: ${params.amount}. Must be a positive number`)
      }
      
      // Validate recipient address (if provided)
      if (params.recipient && !this.isValidAddress(params.recipient)) {
        errors.push(`Invalid recipient address: ${params.recipient}`)
      }
    }
    
    // Status check validation
    if (action === 'check_status') {
      if (!params.transferId) {
        errors.push('Missing required parameter for status check: transferId')
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
    const { fromChainId, toChainId, amount } = params
    
    // Use Bridge Kit for estimation
    try {
      const estimate = await this.estimateTransfer(params, context)
      return {
        gasEstimate: estimate.estimatedGas || '1000000',
        timeEstimate: estimate.estimatedTime || 60000,
        costEstimate: estimate.totalFee || 'Varies by network conditions',
      }
    } catch (error) {
      // Fallback to conservative estimation
      console.warn('Failed to get estimate from Bridge Kit, using conservative values:', error)
      return {
        gasEstimate: '1000000',
        timeEstimate: 60000,
        costEstimate: 'Testnet - minimal cost',
      }
    }
  }
  
  // ==================== Concrete Operation Methods ====================
  
  /**
   * Execute CCTP Cross-Chain Transfer
   */
  private async executeCCTPTransfer(params: Record<string, any>, context: AgentContext): Promise<CCTPTransferResult> {
    const {
      fromChainId,
      toChainId,
      amount,
      recipient = context.userAddress,
      deadline = Date.now() + 30 * 60 * 1000, // Default 30-minute deadline
    } = params
    
    // Generate transfer ID
    const transferId = this.generateTransferId(fromChainId, toChainId, amount, recipient)
    
    // Initialize transfer status
    const transfer: CCTPTransferResult = {
      status: CCTPTransferStatus.PENDING,
      fromChainId: Number(fromChainId),
      toChainId: Number(toChainId),
      amount: String(amount),
      recipient: recipient as Address,
      initiatedAt: Date.now(),
    }
    
    // Save status
    this.transfers.set(transferId, transfer)
    
    console.log(`🚀 Initiating CCTP transfer with Bridge Kit:`, {
      transferId,
      fromChainId,
      toChainId,
      amount,
      recipient,
    })
    
    try {
      // Validate Bridge Kit
      if (!this.bridgeKit) {
        throw new Error('Bridge Kit not initialized')
      }
      
      // Get adapter (simplified, actual should get wallet adapter from context)
      const adapter = await this.getAdapter(context, Number(fromChainId))
      if (!adapter) {
        throw new Error('Unable to get wallet adapter for source chain')
      }
      
      // Map chain identifiers
      const fromChain = mapChainIdToBridgeChain(Number(fromChainId))
      const toChain = mapChainIdToBridgeChain(Number(toChainId))
      
      // Build Bridge Kit parameters
      const bridgeParams = {
        from: { adapter, chain: fromChain },
        to: { adapter, chain: toChain, recipientAddress: recipient },
        amount: amount,
        token: 'USDC' as const,
      }
      
      console.log('📋 Bridge Kit parameters:', bridgeParams)
      
      // Execute cross-chain transfer
      const result = await this.bridgeKit.bridge(bridgeParams)
      
      console.log('📋 Bridge Kit result:', result)
      
      // Extract transaction hashes (based on Bridge Kit result structure)
      let sourceTxHash: string | undefined
      let messageHash: string | undefined
      let destinationTxHash: string | undefined
      
      if (result.state === 'success') {
        // Extract transaction hashes from steps
        for (const step of result.steps) {
          // Determine type based on step name
          if (step.name.toLowerCase().includes('burn') && step.state === 'success' && step.txHash) {
            sourceTxHash = step.txHash
          }
          if (step.name.toLowerCase().includes('message') && step.state === 'success') {
            // Message step may not have transaction hash, but may have other identifier
            messageHash = step.data as string || step.txHash
          }
          if (step.name.toLowerCase().includes('mint') && step.state === 'success' && step.txHash) {
            destinationTxHash = step.txHash
          }
        }
      }
      
      // Update transfer status
      const updatedTransfer: CCTPTransferResult = {
        ...transfer,
        status: result.state === 'success' ? CCTPTransferStatus.INITIATED : CCTPTransferStatus.PENDING,
        sourceTxHash,
        messageHash,
        destinationTxHash,
        note: result.state === 'success' ? 'CCTP cross-chain initiated, waiting for cross-chain message confirmation' : 'Cross-chain in progress',
        implementationRequired: false,
      }
      
      // Update status
      this.transfers.set(transferId, updatedTransfer)
      
      console.log(`✅ CCTP transfer initiated successfully:`, {
        transferId,
        sourceTxHash: updatedTransfer.sourceTxHash,
        messageHash: updatedTransfer.messageHash,
      })
      
      // Log execution
      this.logExecution('cctp_transfer', params, context, updatedTransfer)
      
      return updatedTransfer
      
    } catch (error) {
      console.error('❌ CCTP transfer failed:', error)
      
      // Update to failed status
      const result: CCTPTransferResult = {
        ...transfer,
        status: CCTPTransferStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        note: 'CCTP cross-chain execution failed',
        implementationRequired: false,
      }
      
      // Update status
      this.transfers.set(transferId, result)
      
      // Log execution
      this.logExecution('cctp_transfer', params, context, result)
      
      return result
    }
  }
  
  /**
   * Check Transfer Status
   */
  private async checkTransferStatus(params: Record<string, any>, context: AgentContext): Promise<CCTPTransferResult> {
    const { transferId } = params
    
    // Find transfer record
    const transfer = this.transfers.get(transferId)
    if (!transfer) {
      throw new Error(`Transfer not found: ${transferId}`)
    }
    
    try {
      // If there's a message hash, use Bridge Kit to check on-chain status
      if (transfer.messageHash && this.bridgeKit) {
        console.log(`🔍 Checking CCTP transfer status for message hash: ${transfer.messageHash}`)
        
        // Note: Bridge Kit currently doesn't have direct checkTransferStatus method
        // We can implement by querying on-chain status, simplified here
        // Actual implementation should call Bridge Kit's corresponding method or directly query on-chain data
        
        // Temporarily return current status, marked as requiring implementation
        const updatedTransfer: CCTPTransferResult = {
          ...transfer,
          note: 'Status check functionality requires further Bridge Kit integration',
          implementationRequired: true,
        }
        
        // Save updated status
        this.transfers.set(transferId, updatedTransfer)
        
        console.log(`ℹ️  CCTP transfer status check not fully implemented`)
        
        // Log execution
        this.logExecution('cctp_status_check', params, context, updatedTransfer)
        
        return updatedTransfer
      }
      
      // If no message hash or SDK unavailable, return current status
      console.log(`ℹ️  No message hash or Bridge Kit unavailable for transfer: ${transferId}`)
      
      const result: CCTPTransferResult = {
        ...transfer,
        note: transfer.messageHash ? 'Waiting for cross-chain message confirmation' : 'Transfer not yet initiated',
        implementationRequired: !transfer.messageHash,
      }
      
      // Log execution
      this.logExecution('cctp_status_check', params, context, result)
      
      return result
      
    } catch (error) {
      console.error(`❌ Failed to check CCTP transfer status:`, error)
      
      const result: CCTPTransferResult = {
        ...transfer,
        error: error instanceof Error ? error.message : String(error),
        note: 'Status check failed',
        implementationRequired: false,
      }
      
      // Log execution
      this.logExecution('cctp_status_check', params, context, result)
      
      return result
    }
  }
  
  /**
   * Estimate Transfer Cost
   */
  private async estimateTransfer(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { fromChainId, toChainId, amount } = params
    
    try {
      // Validate Bridge Kit
      if (!this.bridgeKit) {
        throw new Error('Bridge Kit not initialized')
      }
      
      // Get adapter (simplified)
      const adapter = await this.getAdapter(context, Number(fromChainId))
      if (!adapter) {
        throw new Error('Unable to get wallet adapter for estimation')
      }
      
      // Map chain identifiers
      const fromChain = mapChainIdToBridgeChain(Number(fromChainId))
      const toChain = mapChainIdToBridgeChain(Number(toChainId))
      
      // Use Bridge Kit for estimation
      const estimate = await this.bridgeKit.estimate({
        from: { adapter, chain: fromChain },
        to: { adapter, chain: toChain },
        amount: amount,
        token: 'USDC' as const,
      })
      
      console.log('📊 Bridge Kit estimate:', estimate)
      
      // Extract gas estimate from gasFees
      let totalGasEstimate = '1500000' // Default value
      if (estimate.gasFees && estimate.gasFees.length > 0) {
        // Calculate total gas estimate (simplified)
        const totalGas = estimate.gasFees.reduce((sum, fee) => {
          if (fee.fees && fee.fees.fee) {
            return sum + parseFloat(fee.fees.fee)
          }
          return sum
        }, 0)
        totalGasEstimate = totalGas > 0 ? totalGas.toString() : '1500000'
      }
      
      // Extract protocol fees from fees
      let sourceFee = '0.01'
      let destinationFee = '0.02'
      let totalProtocolFee = '0.03'
      
      if (estimate.fees && estimate.fees.length > 0) {
        // Calculate total protocol fees
        const protocolFees = estimate.fees.filter(fee => fee.type === 'provider' && fee.amount)
        const totalFee = protocolFees.reduce((sum, fee) => {
          return sum + parseFloat(fee.amount || '0')
        }, 0)
        totalProtocolFee = totalFee > 0 ? totalFee.toFixed(4) : '0.03'
        
        // Simplified: assume first fee is source chain, second is destination chain
        if (protocolFees.length >= 2) {
          sourceFee = protocolFees[0].amount || '0.01'
          destinationFee = protocolFees[1].amount || '0.02'
        } else if (protocolFees.length === 1) {
          sourceFee = protocolFees[0].amount || '0.01'
          destinationFee = '0.02'
        }
      }
      
      const result = {
        fromChainId,
        toChainId,
        amount,
        estimatedGas: totalGasEstimate,
        estimatedTime: 60000, // Default 1 minute, actual should be obtained from estimate
        estimatedCost: totalProtocolFee,
        sourceChainFee: sourceFee,
        destinationChainFee: destinationFee,
        totalFee: (parseFloat(sourceFee) + parseFloat(destinationFee)).toFixed(4),
        note: 'Estimation based on Bridge Kit',
        implementationRequired: false,
      }
      
      console.log(`📊 CCTP transfer estimate:`, {
        fromChainId,
        toChainId,
        amount,
        estimatedGas: result.estimatedGas,
        estimatedTime: result.estimatedTime,
        totalFee: result.totalFee,
      })
      
      // Log execution
      this.logExecution('cctp_estimate', params, context, result)
      
      return result
      
    } catch (error) {
      console.error('❌ Failed to estimate CCTP transfer:', error)
      
      // Return conservative estimate
      const result = {
        fromChainId,
        toChainId,
        amount,
        estimatedGas: '1500000', // Conservative estimate
        estimatedTime: 90000,    // 1.5 minutes
        estimatedCost: '0.03',   // Conservative cost
        note: 'Estimation failed, using conservative values. Error: ' + (error instanceof Error ? error.message : String(error)),
        implementationRequired: true,
      }
      
      // Log execution
      this.logExecution('cctp_estimate', params, context, result)
      
      return result
    }
  }
  
  // ==================== Utility Methods ====================
  
  /**
   * Get Adapter (Simplified Implementation)
   * Actual should get wallet provider from AgentContext
   */
  private async getAdapter(context: AgentContext, chainId: number): Promise<any> {
    // If there's a configured private key, use it to create adapter (for testing only)
    if (this.circleConfig.privateKey) {
      try {
        // Validate chain support
        const supportedChainIds = [arbitrumSepolia.id, baseSepolia.id, sepolia.id] as number[]
        if (!supportedChainIds.includes(chainId)) {
          throw new Error(`Unsupported chain ID for adapter: ${chainId}`)
        }

        // Create adapter - using correct API
        const adapter = createViemAdapterFromPrivateKey({
          privateKey: this.circleConfig.privateKey,
          getPublicClient: ({ chain }) => {
            let rpcUrl: string
            
            // Select RPC URL based on chain ID
            if (chain.id === arbitrumSepolia.id) {
              rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || arbitrumSepolia.rpcUrls.default.http[0]
            } else if (chain.id === baseSepolia.id) {
              rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || baseSepolia.rpcUrls.default.http[0]
            } else if (chain.id === sepolia.id) {
              rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC || sepolia.rpcUrls.default.http[0]
            } else {
              // Default to chain's default RPC
              rpcUrl = chain.rpcUrls.default.http[0]
            }
            
            console.log(`🔗 Creating public client for chain ${chain.id} with RPC: ${rpcUrl}`)
            return createPublicClient({
              chain,
              transport: http(rpcUrl),
            })
          }
        })
        
        console.log(`✅ Adapter created for chain ${chainId}`)
        return adapter
      } catch (error) {
        console.error('Failed to create adapter from private key:', error)
        // Continue trying other methods
      }
    }
    
    // Try to get wallet adapter from context
    // This needs to be implemented based on actual project structure
    console.warn('No private key provided and wallet adapter not implemented, using fallback')
    
    // Return null indicating external adapter is needed
    return null
  }
  
  /**
   * Validate Contract Addresses
   */
  private validateContractAddresses(): void {
    const { messageTransmitterAddress, tokenMessengerAddress } = this.circleConfig
    
    if (!this.isValidAddress(messageTransmitterAddress)) {
      throw new Error(`Invalid MessageTransmitter address: ${messageTransmitterAddress}`)
    }
    
    if (!this.isValidAddress(tokenMessengerAddress)) {
      throw new Error(`Invalid TokenMessenger address: ${tokenMessengerAddress}`)
    }
    
    console.log('Circle CCTP contract addresses validated')
  }
  
  /**
   * Validate Address Format
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  
  /**
   * Validate Amount Format
   */
  private isValidAmount(amount: string): boolean {
    if (!amount || typeof amount !== 'string') return false
    
    // Check if valid number
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0
  }
  
  /**
   * Generate Transfer ID
   */
  private generateTransferId(
    fromChainId: number,
    toChainId: number,
    amount: string,
    recipient: string
  ): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `cctp_${fromChainId}_${toChainId}_${amount}_${recipient}_${timestamp}_${random}`
  }
  
  /**
   * Get USDC Address
   */
  private getUSDCAddress(chainId: number): Address {
    try {
      // Try to get from addresses.ts
      return getUSDCAddress(chainId)
    } catch (error) {
      // Return default testnet addresses
      if (chainId === ChainId.ARBITRUM_SEPOLIA) {
        return '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address
      } else if (chainId === ChainId.BASE_SEPOLIA) {
        return '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address
      }
      throw new Error(`USDC address not found for chain ${chainId}`)
    }
  }
  
  /**
   * Map SDK Status to CCTP Status
   */
  private mapSDKStatusToCCTPStatus(sdkStatus: string): CCTPTransferStatus {
    const statusMap: Record<string, CCTPTransferStatus> = {
      'PENDING': CCTPTransferStatus.PENDING,
      'INITIATED': CCTPTransferStatus.INITIATED,
      'MESSAGE_SENT': CCTPTransferStatus.MESSAGE_SENT,
      'COMPLETED': CCTPTransferStatus.COMPLETED,
      'FAILED': CCTPTransferStatus.FAILED,
      'CONFIRMED': CCTPTransferStatus.COMPLETED,
      'EXECUTED': CCTPTransferStatus.COMPLETED,
    }
    
    return statusMap[sdkStatus.toUpperCase()] || CCTPTransferStatus.PENDING
  }
  
  /**
   * Reset Skill
   */
  protected onReset(): void {
    this.transfers.clear()
  }
}

// ==================== Export and Registration ====================

/**
 * Create and Register Circle CCTP Skill Instance
 */
export function initializeCircleSkill(config: CircleSkillConfig = {}): CircleSkill {
  return createAndRegisterSkill(CircleSkill, config)
}

/**
 * Get Circle CCTP Skill Instance
 */
export async function getCircleSkill(): Promise<CircleSkill | undefined> {
  try {
    // Use ES module dynamic import to avoid circular dependency
    const { getSkillRegistry } = await import('./base-skill')
    const registry = getSkillRegistry()
    return registry.get('circle') as CircleSkill | undefined
  } catch (error) {
    console.error('Failed to get Circle skill:', error)
    return undefined
  }
}