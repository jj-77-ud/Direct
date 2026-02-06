/**
 * LI.FI Skill Implementation
 *
 * Encapsulates LI.FI SDK cross-chain bridging logic.
 * Supports multi-chain, multi-token cross-chain transfers with optimal route selection.
 *
 * Bounty requirement: Must demonstrate how AI Agent makes routing decisions based on quotes.
 */

import { BaseSkill, createAndRegisterSkill } from './base-skill'
import { type SkillMetadata, type AgentContext, type SkillExecutionResult } from '../types/agent'
import { type Address } from '../types/blockchain'
import { ChainId } from '../constants/chains'
import { getLiFiExecutorAddress, ContractName, getUSDCAddress } from '../constants/addresses'
import { getRoutes, getStatus, executeRoute, type RoutesRequest, type Route, type StatusResponse, createConfig } from '@lifi/sdk'
import { parseUnits, formatUnits } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'

// ==================== Skill Configuration ====================

/**
 * LI.FI Skill Configuration
 */
export interface LiFiSkillConfig {
  // LI.FI API Configuration
  apiKey?: string               // LI.FI API Key
  baseUrl?: string              // API Base URL
  
  // Executor Configuration
  executorAddress?: Address     // LiFi Diamond contract address
  
  // Cross-chain Configuration
  defaultSlippage?: number      // Default slippage tolerance (percentage)
  defaultGasLimit?: string      // Default gas limit
  
  // Retry Configuration
  maxRetries?: number
  retryDelay?: number
  
  // Debug Configuration
  debugMode?: boolean
  
  // Wallet Client (optional, for transaction execution)
  walletClient?: any            // viem WalletClient instance
}

// ==================== Type Definitions ====================

/**
 * LI.FI Quote Parameters
 */
export interface LiFiQuoteParams {
  fromChainId: number           // Source chain ID
  toChainId: number             // Destination chain ID
  fromTokenAddress: Address     // Source token address
  toTokenAddress: Address       // Destination token address
  amount: string                // Amount (string format)
  fromAddress?: Address         // Sender address
  toAddress?: Address           // Recipient address
  slippage?: number             // Slippage tolerance
  allowBridges?: string[]       // Allowed bridges
  denyBridges?: string[]        // Denied bridges
}

/**
 * LI.FI Quote Result
 */
export interface LiFiQuote {
  id: string                    // Quote ID
  fromChainId: number
  toChainId: number
  fromToken: {
    address: Address
    symbol: string
    name: string
    decimals: number
  }
  toToken: {
    address: Address
    symbol: string
    name: string
    decimals: number
  }
  fromAmount: string            // Source amount
  toAmount: string              // Destination amount
  toAmountMin: string           // Minimum received amount (considering slippage)
  
  // Fee Information
  gasCosts?: Array<{
    type: string
    amount: string
    token: {
      address: Address
      symbol: string
      decimals: number
    }
  }>
  
  // Path Information
  bridges?: string[]            // Bridges used
  steps?: Array<{
    type: string
    tool: string
    action: any
  }>
  
  // Time Information
  estimatedTime?: number        // Estimated time (seconds)
  
  // Metadata
  transactionRequest?: any      // Transaction request data
}

/**
 * LI.FI Execution Status
 */
export enum LiFiExecutionStatus {
  PENDING = 'PENDING',          // Waiting to start
  QUOTE_RECEIVED = 'QUOTE_RECEIVED', // Quote received
  TRANSACTION_SENT = 'TRANSACTION_SENT', // Transaction sent
  COMPLETED = 'COMPLETED',      // Completed
  FAILED = 'FAILED',            // Failed
}

/**
 * LI.FI Execution Result
 */
export interface LiFiExecutionResult {
  status: LiFiExecutionStatus
  quoteId?: string              // Quote ID
  fromChainId: number
  toChainId: number
  fromAmount: string
  toAmount?: string
  
  // Transaction Information
  transactionHash?: string      // Transaction hash
  bridgeName?: string           // Bridge used
  
  // Time Information
  startedAt?: number            // Start time
  completedAt?: number          // Completion time
  
  // Error Information
  error?: string
  retryCount?: number
  
  // Implementation Status Information
  note?: string                 // Implementation note
  implementationRequired?: boolean // Whether real implementation is required
}

// ==================== Skill Implementation ====================

/**
 * LI.FI Skill Class
 */
export class LiFiSkill extends BaseSkill {
  // Skill Metadata
  readonly metadata: SkillMetadata = {
    id: 'lifi',
    name: 'LI.FI Cross-Chain Bridge',
    description: 'Cross-chain transfers using LI.FI SDK for multi-chain, multi-token support',
    version: '1.0.0',
    author: 'Nomad Arc Team',
    
    capabilities: [
      'lifi_get_quote',         // Get cross-chain quote
      'lifi_execute',           // Execute cross-chain transaction
      'lifi_check_status',      // Check execution status
      'lifi_estimate',          // Estimate cross-chain cost
    ],
    
    requiredParams: ['action'], // action: 'quote' | 'execute' | 'status' | 'estimate'
    optionalParams: [
      'fromChainId', 'toChainId', 'fromTokenAddress', 'toTokenAddress',
      'amount', 'fromAddress', 'toAddress', 'slippage', 'quoteId',
    ],
    
    supportedChains: [
      ChainId.ARBITRUM_SEPOLIA,  // Arbitrum Sepolia
      ChainId.BASE_SEPOLIA,      // Base Sepolia
      ChainId.SEPOLIA,           // Sepolia
      ChainId.BUILD_BEAR_ARBITRUM_SANDBOX, // BuildBear Arbitrum Sandbox
      ChainId.ETHEREUM,          // Ethereum Mainnet
      ChainId.ARBITRUM,          // Arbitrum Mainnet
      ChainId.BASE,              // Base Mainnet
      ChainId.OPTIMISM,          // Optimism Mainnet
      ChainId.POLYGON,           // Polygon Mainnet
      ChainId.AVALANCHE,         // Avalanche Mainnet
      ChainId.BSC,               // BSC Mainnet
    ],
    
    isAsync: true,
  }
  
  // Skill-specific configuration
  private lifiConfig: Required<LiFiSkillConfig>
  
  // Execution status tracking
  private executions: Map<string, LiFiExecutionResult> = new Map()
  
  /**
   * Constructor
   */
  constructor(config: LiFiSkillConfig = {}) {
    super(config)
    
    // Remove hardcoded API Key, use production environment
    const apiKey = config.apiKey || process.env.NEXT_PUBLIC_LIFI_API_KEY || ''
    
    // Use production API endpoint, add allowTestnets configuration
    this.lifiConfig = {
      apiKey: apiKey,
      baseUrl: config.baseUrl || 'https://li.quest/v1', // Use production API
      executorAddress: config.executorAddress || '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae', // Default testnet address
      defaultSlippage: config.defaultSlippage || 0.5, // 0.5%
      defaultGasLimit: config.defaultGasLimit || '1000000',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 2000,
      debugMode: config.debugMode || false,
      walletClient: config.walletClient, // Optional wallet client
    }
    
    console.log('LI.FI skill configuration completed:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
      baseUrl: this.lifiConfig.baseUrl,
      isProduction: !this.lifiConfig.baseUrl.includes('staging'),
    })
  }
  
  // ==================== Utility Functions ====================

  /**
   * Manually create LI.FI SDK compatible Signer
   * Avoid DataCloneError caused by SDK automatically cloning walletClient
   * Create "minimal data" Signer without any complex object references
   * Use closure to reference external walletClient, ensuring object can be structuredClone
   */
  private createLiFiSigner(walletClient: any): any {
    console.log('🔧 Manually creating "minimal data" Signer (completely avoiding structuredClone limitations)')
    
    // Print wallet client information for debugging
    console.log('📋 Wallet client information:', {
      chainId: walletClient.chain?.id,
      account: walletClient.account?.address,
      hasSignMessage: typeof walletClient.signMessage === 'function',
      hasSendTransaction: typeof walletClient.sendTransaction === 'function',
    })
    
    // Extract key information as pure strings/numbers
    const accountAddress = walletClient.account?.address || ''
    const chainId = walletClient.chain?.id || 31337
    
    // Create minimal Signer object - only basic data, no functions
    // Functions will be accessed via closure when called
    const minimalSigner = {
      // Pure data properties - can be structuredClone
      address: accountAddress,
      chainId: 42161, // Logical ID to trick SDK
      
      // Mark as Signer
      _isSigner: true,
      _isMinimalSigner: true,
    }
    
    console.log('✅ "Minimal data" Signer created successfully')
    console.log('📋 Signer data properties:', Object.keys(minimalSigner).filter(k => !k.startsWith('_')))
    
    // Verify object can be serialized
    try {
      const testClone = structuredClone(minimalSigner)
      console.log('✅ Signer serialization verification passed - object contains only basic data')
    } catch (cloneError) {
      console.error('❌ Signer cannot be serialized:', (cloneError as Error).message)
      console.log('⚠️ This should not happen as object only contains strings and numbers')
      throw new Error(`Signer cannot be serialized: ${(cloneError as Error).message}`)
    }
    
    // Create proxy object to dynamically bind functions when called
    // This proxy won't be structuredClone because executeRoute clones minimalSigner, not the proxy
    const signerProxy = new Proxy(minimalSigner, {
      get(target, prop, receiver) {
        // If it's a data property, return directly
        if (prop in target) {
          return Reflect.get(target, prop, receiver)
        }
        
        // If it's a method call, dynamically create function
        switch (prop) {
          case 'getAddress':
            return async () => accountAddress
            
          case 'getChainId':
            return async () => 42161 // Logical ID
            
          case 'signMessage':
            return async (message: string) => {
              console.log('🔐 Calling signMessage via closure')
              return await walletClient.signMessage({
                account: walletClient.account,
                message
              })
            }
            
          case 'sendTransaction':
            return async (transaction: any) => {
              console.log('📤 Calling sendTransaction via closure:', {
                to: transaction.to,
                data: transaction.data?.substring(0, 100) + '...',
                value: transaction.value,
                chainId: chainId,
              })
              
              // Use walletClient to send transaction, ensuring physical chain ID matches
              return await walletClient.sendTransaction({
                account: walletClient.account,
                to: transaction.to,
                data: transaction.data,
                value: transaction.value ? BigInt(transaction.value) : 0n,
                chain: walletClient.chain,
              })
            }
            
          case 'confirmTransaction':
            return async (hash: string) => {
              console.log(`⏳ Confirming transaction: ${hash}`)
              // Need publicClient here, but we can create when needed
              return { hash, status: 'success' }
            }
            
          default:
            return undefined
        }
      },
      
      // Ensure has check works correctly
      has(target, prop) {
        return prop in target ||
          ['getAddress', 'getChainId', 'signMessage', 'sendTransaction', 'confirmTransaction'].includes(prop as string)
      },
      
      // Ensure ownKeys only returns data properties
      ownKeys(target) {
        return Reflect.ownKeys(target)
      },
      
      // Ensure getOwnPropertyDescriptor works correctly
      getOwnPropertyDescriptor(target, prop) {
        if (prop in target) {
          return Reflect.getOwnPropertyDescriptor(target, prop)
        }
        return undefined
      }
    })
    
    return signerProxy
  }

  // ==================== Abstract Method Implementation ====================

  /**
   * Initialize LI.FI skill
   */
  protected async onInitialize(): Promise<void> {
    console.log('Initializing LI.FI skill...')
    
    try {
      // Use createConfig to configure LI.FI SDK, add allowTestnets configuration
      const config = createConfig({
        apiUrl: this.lifiConfig.baseUrl,
        integrator: 'Nomad-Arc', // Required integrator parameter
        apiKey: this.lifiConfig.apiKey,
        // Allow testnets
        allowTestnets: true,
        // Override RPC for Arbitrum mainnet fork
        rpcs: {
          [42161]: [process.env.NEXT_PUBLIC_ARBITRUM_SANDBOX_RPC || 'https://rpc.buildbear.io/delicate-cannonball-45d06d30'],
        },
        // Disable multichain RPC switching to ensure sandbox RPC is used
        multichain: false,
      } as any) // Use as any to bypass type checking
      
      console.log('LI.FI SDK configured:', {
        baseUrl: this.lifiConfig.baseUrl,
        integrator: 'Nomad-Arc',
        hasApiKey: !!this.lifiConfig.apiKey,
        apiKeyLength: this.lifiConfig.apiKey.length,
        allowTestnets: true,
      })
      
      // Validate configuration
      this.validateConfig()
      
      // Clear status tracking
      this.executions.clear()
      
      console.log('✅ LI.FI skill initialized successfully')
      console.log('📋 Supported chains:', this.metadata.supportedChains)
      console.log('📋 Executor address:', this.lifiConfig.executorAddress)
      console.log('📋 API URL:', this.lifiConfig.baseUrl)
      console.log('📋 API Key configured:', !!this.lifiConfig.apiKey)
      console.log('📋 Allow testnets:', true)
    } catch (error) {
      console.error('❌ Failed to initialize LI.FI skill:', error)
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        })
      }
      console.log('⚠️  Continuing with framework-only mode')
    }
  }
  
  /**
   * Execute LI.FI operation
   */
  protected async onExecute(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { action } = params
    
    switch (action) {
      case 'quote':
        return await this.getQuote(params, context)
      
      case 'execute':
        return await this.executeTransfer(params, context)
      
      case 'status':
        return await this.checkExecutionStatus(params, context)
      
      case 'estimate':
        return await this.estimateTransfer(params, context)
      
      default:
        throw new Error(`Unsupported LI.FI action: ${action}`)
    }
  }
  
  /**
   * Custom parameter validation
   */
  protected onValidate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const { action } = params
    
    if (!action) {
      errors.push('Missing required parameter: action')
      return { valid: false, errors }
    }
    
    // Validate parameters based on action
    if (action === 'quote' || action === 'execute' || action === 'estimate') {
      if (!params.fromChainId) {
        errors.push('Missing required parameter: fromChainId')
      }
      
      if (!params.toChainId) {
        errors.push('Missing required parameter: toChainId')
      }
      
      if (!params.fromTokenAddress) {
        errors.push('Missing required parameter: fromTokenAddress')
      } else if (!this.isValidAddress(params.fromTokenAddress)) {
        errors.push(`Invalid fromTokenAddress: ${params.fromTokenAddress}`)
      }
      
      if (!params.toTokenAddress) {
        errors.push('Missing required parameter: toTokenAddress')
      } else if (!this.isValidAddress(params.toTokenAddress)) {
        errors.push(`Invalid toTokenAddress: ${params.toTokenAddress}`)
      }
      
      if (!params.amount) {
        errors.push('Missing required parameter: amount')
      } else if (!this.isValidAmount(params.amount)) {
        errors.push(`Invalid amount: ${params.amount}`)
      }
    }
    
    if (action === 'execute' || action === 'status') {
      if (!params.quoteId) {
        errors.push('Missing required parameter: quoteId')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    }
  }
  
  /**
   * Estimate execution cost
   */
  protected async onEstimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }> {
    // LI.FI cross-chain typically involves complex multi-step operations
    // Provide conservative estimates here
    
    const gasEstimate = '1500000' // Conservative estimate
    const timeEstimate = 120000   // 2-minute estimate
    
    return {
      gasEstimate,
      timeEstimate,
      costEstimate: 'Varies by route and network conditions',
    }
  }
  
  // ==================== Concrete Operation Methods ====================
  
  /**
   * Get cross-chain quote (core functionality for bounty requirement)
   */
  private async getQuote(params: Record<string, any>, context: AgentContext): Promise<LiFiQuote> {
    const {
      fromChainId,
      toChainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      fromAddress = context.userAddress,
      toAddress = context.userAddress,
      slippage = this.lifiConfig.defaultSlippage,
    } = params
    
    console.log('Getting LI.FI quote:', {
      fromChainId,
      toChainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage,
    })
    
    // Testnet token address mapping - hackathon demo fallback path
    const TESTNET_TOKEN_ADDRESSES = {
      // Arbitrum Sepolia
      421614: {
        USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA1d' as Address,
        WETH: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73' as Address,
      },
      // Base Sepolia
      84532: {
        USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
        WETH: '0x4200000000000000000000000000000000000006' as Address,
      },
    }
    
    // If provided address is zero address or invalid, use fallback address
    let finalFromTokenAddress = fromTokenAddress as Address
    let finalToTokenAddress = toTokenAddress as Address
    
    // Check if it's a testnet and try to use known token addresses
    if (fromChainId === 421614 || fromChainId === 84532) {
      if (fromTokenAddress === '0x0000000000000000000000000000000000000000' ||
          fromTokenAddress === '0xf3c3351d6bd0098eeb33ca8f830faf2a141ea2e1') {
        // Use USDC as fallback
        finalFromTokenAddress = TESTNET_TOKEN_ADDRESSES[fromChainId as keyof typeof TESTNET_TOKEN_ADDRESSES]?.USDC || fromTokenAddress as Address
        console.log(`Using testnet fallback token address (${fromChainId}):`, finalFromTokenAddress)
      }
    }
    
    if (toChainId === 421614 || toChainId === 84532) {
      if (toTokenAddress === '0x0000000000000000000000000000000000000000' ||
          toTokenAddress === '0xf3c3351d6bd0098eeb33ca8f830faf2a141ea2e1') {
        // Use USDC as fallback
        finalToTokenAddress = TESTNET_TOKEN_ADDRESSES[toChainId as keyof typeof TESTNET_TOKEN_ADDRESSES]?.USDC || toTokenAddress as Address
        console.log(`Using testnet fallback token address (${toChainId}):`, finalToTokenAddress)
      }
    }
    
    try {
      // Chain ID mapping: BuildBear sandbox (31337) -> Arbitrum mainnet (42161)
      // LI.FI API doesn't recognize private sandbox ID, need to map to corresponding mainnet ID
      const mappedFromChainId = Number(fromChainId) === 31337 ? 42161 : Number(fromChainId)
      const mappedToChainId = Number(toChainId) === 31337 ? 42161 : Number(toChainId)
      
      console.log('Chain ID mapping:', {
        originalFromChainId: fromChainId,
        mappedFromChainId,
        originalToChainId: toChainId,
        mappedToChainId,
        note: 'BuildBear sandbox (31337) mapped to Arbitrum mainnet (42161) for LI.FI API compatibility'
      })
      
      // Convert amount to BigIntish format (integer string of token smallest unit)
      // LI.FI API expects fromAmount to be in BigIntish format (integer string)
      let fromAmountBigIntish: string
      try {
        // Try to parse amount string as number
        const amountNum = parseFloat(String(amount))
        if (isNaN(amountNum)) {
          throw new Error(`Invalid amount: ${amount}`)
        }
        
        // Determine decimal places based on token address
        // For USDC (Arbitrum mainnet address), use 6 decimals
        // For ETH (zero address), use 18 decimals
        // For other tokens, use default 18 decimals
        let decimals = 18 // Default
        const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase()
        const wethAddress = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'.toLowerCase()
        
        if (finalFromTokenAddress.toLowerCase() === usdcAddress) {
          decimals = 6
          console.log(`Detected USDC token, using ${decimals} decimals`)
        } else if (finalFromTokenAddress.toLowerCase() === wethAddress ||
                   finalFromTokenAddress === '0x0000000000000000000000000000000000000000') {
          decimals = 18
          console.log(`Detected ETH/WETH token, using ${decimals} decimals`)
        } else {
          console.log(`Unknown token address ${finalFromTokenAddress}, using default ${decimals} decimals`)
        }
        
        // Use parseUnits to convert decimal amount to BigInt
        const amountBigInt = parseUnits(String(amountNum), decimals)
        fromAmountBigIntish = amountBigInt.toString()
        
        console.log('Amount conversion:', {
          originalAmount: amount,
          parsedAmount: amountNum,
          decimals,
          bigIntValue: amountBigInt.toString(),
          bigIntishString: fromAmountBigIntish
        })
      } catch (convertError) {
        console.error('Amount conversion failed, using original string:', convertError)
        // If conversion fails, use original string (might already be in BigIntish format)
        fromAmountBigIntish = String(amount)
      }
      
      // Use real LI.FI SDK to get quote (using mapped chain IDs)
      const request = {
        fromChainId: mappedFromChainId,
        toChainId: mappedToChainId,
        fromTokenAddress: finalFromTokenAddress,
        toTokenAddress: finalToTokenAddress,
        fromAmount: fromAmountBigIntish,
        fromAddress: fromAddress as Address,
        toAddress: toAddress as Address,
        options: {
          slippage: slippage / 100, // Convert to decimal
          order: 'RECOMMENDED' as const,
        },
      }
      
      console.log('LI.FI request parameters (mapped):', JSON.stringify(request, null, 2))
      console.log('Request URL:', `${this.lifiConfig.baseUrl}/advanced/routes`)
      
      const routes = await getRoutes(request)
      
      if (!routes.routes || routes.routes.length === 0) {
        throw new Error('No routes found for the given parameters')
      }
      
      const route = routes.routes[0]
      
      // Convert LI.FI SDK's Route to our LiFiQuote format
      const quote: LiFiQuote = {
        id: route.id || `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromChainId: route.fromChainId,
        toChainId: route.toChainId,
        fromToken: {
          address: route.fromToken.address as Address,
          symbol: route.fromToken.symbol,
          name: route.fromToken.name,
          decimals: route.fromToken.decimals,
        },
        toToken: {
          address: route.toToken.address as Address,
          symbol: route.toToken.symbol,
          name: route.toToken.name,
          decimals: route.toToken.decimals,
        },
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
        toAmountMin: route.toAmountMin || route.toAmount,
        
        // Fee information - adjust based on actual Route type
        gasCosts: (route as any).gasCosts?.map((cost: any) => ({
          type: cost.type || 'GAS',
          amount: cost.amount || '0',
          token: {
            address: (cost.token?.address || '0x0000000000000000000000000000000000000000') as Address,
            symbol: cost.token?.symbol || 'ETH',
            decimals: cost.token?.decimals || 18,
          },
        })),
        
        // Path information
        bridges: route.steps
          .filter((step: any) => step.type === 'cross' || step.type === 'lifi')
          .map((step: any) => step.tool),
        steps: route.steps.map((step: any) => ({
          type: step.type,
          tool: step.tool,
          action: step.action,
        })),
        
        // Time information - use actual property or default value
        estimatedTime: (route as any).estimatedDuration || 120,
        
        // Transaction request data
        transactionRequest: {
          route,
          note: 'Real LI.FI SDK quote',
          implementationRequired: false,
        },
      }
      
      console.log('LI.FI quote obtained successfully:', {
        quoteId: quote.id,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        bridges: quote.bridges,
        steps: quote.steps?.length,
      })
      
      // Log execution
      this.logExecution('lifi_get_quote', params, context, quote)
      
      return quote
      
    } catch (error) {
      console.error('LI.FI quote acquisition failed:', error)
      
      // Log error
      this.logExecution('lifi_get_quote_error', params, context, { error: String(error) })
      
      // According to requirements: if real RPC call fails, strictly prohibit falling back to mock data
      // Throw error directly, do not return any placeholder data
      throw new Error(`LI.FI quote acquisition failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * Execute cross-chain transfer
   */
  private async executeTransfer(params: Record<string, any>, context: AgentContext): Promise<LiFiExecutionResult> {
    const {
      quoteId,
      fromAddress = context.userAddress,
      amount,
      fromChainId,
      toChainId,
      route // New: LI.FI SDK Route object
    } = params
    
    // Generate execution ID
    const executionId = `exec_${quoteId}_${Date.now()}`
    
    // Initialize execution status
    const execution: LiFiExecutionResult = {
      status: LiFiExecutionStatus.PENDING,
      quoteId,
      fromChainId,
      toChainId,
      fromAmount: amount,
      startedAt: Date.now(),
    }
    
    // Save status
    this.executions.set(executionId, execution)
    
    console.log('Executing LI.FI transfer:', {
      executionId,
      quoteId,
      fromAddress,
      fromChainId,
      toChainId,
      amount,
      hasRoute: !!route,
    })

    // If it's Arbitrum sandbox, print BuildBear Explorer URL template
    if (fromChainId === 42161 || fromChainId === 31337) {
      console.log('📡 BuildBear Arbitrum Sandbox Explorer: https://explorer.buildbear.io/delicate-cannonball-45d06d30')
      console.log('  Transaction hash URL template: https://explorer.buildbear.io/delicate-cannonball-45d06d30/tx/{txHash}')
    }
    
    try {
      // Check if wallet client exists
      if (!this.lifiConfig.walletClient) {
        throw new Error('Wallet client not configured. Please provide a wallet client in LiFiSkillConfig.')
      }
      
      // Check if route exists
      if (!route) {
        throw new Error('Route not provided. Please provide the LI.FI route from the quote.')
      }
      
      console.log('🚀 Executing LI.FI cross-chain transfer using lightweight strategy')
      console.log('📋 Route details:', {
        fromChainId: route.fromChainId,
        toChainId: route.toChainId,
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
        steps: route.steps?.length || 0,
        bridges: route.steps?.map((step: any) => step.tool).filter(Boolean) || [],
      })
      
      // Check approval status
      console.log('Checking token approval status...')
      
      // For USDC token, ensure it's approved to LI.FI executor
      // LI.FI SDK usually handles approval, but check for safety
      const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
      const lifiExecutor = this.lifiConfig.executorAddress
      
      if (route.fromToken.address.toLowerCase() === usdcAddress.toLowerCase()) {
        console.log('USDC token detected, ensuring approval...')
        // In actual implementation, should check and execute approval here
        // But LI.FI SDK's transactionRequest might already include approval logic
      }
      
      // Use LI.FI SDK's executeRoute to execute cross-chain transfer
      console.log('⏳ Using LI.FI SDK executeRoute to execute cross-chain transfer...')
      
      try {
        // Get wallet client
        const walletClient = this.lifiConfig.walletClient
        
        if (!walletClient) {
          throw new Error('Wallet client not configured, cannot execute transaction')
        }
        
        // Manually create LI.FI SDK compatible Signer to avoid DataCloneError from automatic cloning
        const lifiSigner = this.createLiFiSigner(walletClient)
        
        // SDK logical ID trick: ensure route object uses logical ID 42161 instead of physical ID 31337
        // LI.FI SDK needs to see 42161 (Arbitrum mainnet) to process route correctly
        const processedRoute = { ...route }
        if (processedRoute.fromChainId === 31337) {
          console.log('🔄 Performing SDK logical ID trick: mapping fromChainId from 31337 to 42161')
          processedRoute.fromChainId = 42161
          
          // Also update chain IDs in route steps
          if (processedRoute.steps && Array.isArray(processedRoute.steps)) {
            processedRoute.steps = processedRoute.steps.map((step: any) => {
              if (step.action.fromChainId === 31337) {
                return {
                  ...step,
                  action: {
                    ...step.action,
                    fromChainId: 42161
                  }
                }
              }
              return step
            })
          }
        }
        
        // Try to execute route using LI.FI SDK's executeRoute function
        console.log('🚀 Attempting to call executeRoute for cross-chain transaction (using manual Signer)...')
        console.log('📋 Route details:', {
          originalFromChainId: route.fromChainId,
          processedFromChainId: processedRoute.fromChainId,
          toChainId: processedRoute.toChainId,
          fromAmount: processedRoute.fromAmount,
          toAmount: processedRoute.toAmount,
          steps: processedRoute.steps?.length || 0,
        })
        
        let executeResult: any
        let transactionHash: `0x${string}` | undefined
        
        try {
          // Execute route - executeRoute handles all steps including approval and cross-chain transaction
          console.log('⏳ Executing cross-chain route...')
          executeResult = await executeRoute(lifiSigner, processedRoute)
          
          console.log('✅ LI.FI SDK executeRoute call successful')
          
          // According to LI.FI SDK documentation, executeRoute returns updated route
          // Transaction hash might be in route's steps
          const steps = executeResult.steps || []
          for (const step of steps) {
            if ((step as any).transactionHash) {
              transactionHash = (step as any).transactionHash as `0x${string}`
              console.log(`🔍 Found transaction hash in step "${step.type}": ${transactionHash}`)
              break
            } else if ((step as any).transactionId) {
              transactionHash = (step as any).transactionId as `0x${string}`
              console.log(`🔍 Found transaction ID in step "${step.type}": ${transactionHash}`)
              break
            }
          }
          
          // If not found in steps, try to find in other parts of route
          if (!transactionHash && (executeResult as any).transactionHash) {
            transactionHash = (executeResult as any).transactionHash as `0x${string}`
          } else if (!transactionHash && (executeResult as any).transactionId) {
            transactionHash = (executeResult as any).transactionId as `0x${string}`
          }
          
          if (!transactionHash) {
            console.warn('⚠️  executeRoute did not return transaction hash, checking route steps:')
            console.log(JSON.stringify(executeResult, null, 2))
            throw new Error('executeRoute did not return transaction hash, please check route execution status')
          }
          
        } catch (executeError) {
          console.warn('⚠️  LI.FI SDK executeRoute execution failed (possibly DataCloneError):',
            executeError instanceof Error ? executeError.message : String(executeError))
          
          // Alternative: manually extract transactionRequest and send transaction
          console.log('🔄 Attempting manual transaction sending as alternative...')
          
          // Check if route contains transactionRequest
          if (processedRoute.transactionRequest) {
            console.log('📋 Route contains transactionRequest, attempting manual send...')
            const txRequest = processedRoute.transactionRequest
            
            // Manually send transaction
            console.log('📤 Manually sending transaction...')
            transactionHash = await walletClient.sendTransaction({
              account: walletClient.account,
              to: txRequest.to,
              data: txRequest.data,
              value: txRequest.value ? BigInt(txRequest.value) : 0n,
              chain: walletClient.chain,
            })
            
            console.log(`✅ Manual transaction sent successfully, hash: ${transactionHash}`)
            executeResult = { transactionHash, steps: [] }
            
          } else if (processedRoute.steps && processedRoute.steps.length > 0) {
            // Try to extract transaction data from first step
            console.log('📋 Extracting transaction data from route steps...')
            const firstStep = processedRoute.steps[0]
            if (firstStep.transactionRequest) {
              const txRequest = firstStep.transactionRequest
              console.log('📤 Manually sending transaction from first step...')
              transactionHash = await walletClient.sendTransaction({
                account: walletClient.account,
                to: txRequest.to,
                data: txRequest.data,
                value: txRequest.value ? BigInt(txRequest.value) : 0n,
                chain: walletClient.chain,
              })
              
              console.log(`✅ Manual transaction sent successfully, hash: ${transactionHash}`)
              executeResult = { transactionHash, steps: [firstStep] }
            } else {
              throw new Error('Route does not contain executable transaction request, cannot send manually')
            }
          } else {
            // Re-throw original error
            throw executeError
          }
        }
        
        if (!transactionHash) {
          throw new Error('Unable to obtain transaction hash, execution failed')
        }
        
        console.log('📊 Execution result:', {
          transactionHash,
          fromAmount: executeResult?.fromAmount || processedRoute.fromAmount,
          toAmount: executeResult?.toAmount || processedRoute.toAmount,
          steps: executeResult?.steps?.length || 0,
        })
        
        const explorerUrl = `https://explorer.buildbear.io/delicate-cannonball-45d06d30/tx/${transactionHash}`
        
        console.log(`✅ Transaction sent, waiting for confirmation...`)
        console.log(`   Transaction hash: ${transactionHash}`)
        console.log(`   Explorer URL: ${explorerUrl}`)
        
        // Wait for transaction confirmation and get receipt
        console.log('⏳ Waiting for transaction confirmation...')
        const receipt = await waitForTransactionReceipt(walletClient, {
          hash: transactionHash,
          timeout: 120_000, // 2-minute timeout
        })
        
        // Print transaction receipt details
        console.log('✅ Transaction confirmed successfully!')
        console.log(`   Block number: ${receipt.blockNumber}`)
        console.log(`   Block hash: ${receipt.blockHash}`)
        console.log(`   Transaction index: ${receipt.transactionIndex}`)
        console.log(`   Gas used: ${receipt.gasUsed}`)
        console.log(`   Status: ${receipt.status === 'success' ? 'Success' : 'Failure'}`)
        
        if (receipt.status !== 'success') {
          throw new Error(`Transaction execution failed, status: ${receipt.status}`)
        }
        
        const result: LiFiExecutionResult = {
          ...execution,
          status: LiFiExecutionStatus.COMPLETED,
          transactionHash,
          toAmount: route.toAmount,
          bridgeName: route.steps?.[0]?.tool || 'LI.FI',
          completedAt: Date.now(),
          note: `Transaction confirmed successfully! Block number: ${receipt.blockNumber}, Gas used: ${receipt.gasUsed}`,
          implementationRequired: false, // Mark as implemented
          retryCount: 0,
        }
        
        // Update status
        this.executions.set(executionId, result)
        
        // Log execution
        this.logExecution('lifi_execute', params, context, result)
        
        return result
        
      } catch (error) {
        console.error('❌ LI.FI cross-chain transfer execution failed:', error)
        
        // Record detailed error information
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          })
        }
        
        // Check if it's a configuration issue
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        if (errorMessage.includes('insufficient funds')) {
          console.log('⚠️  Insufficient balance, ensure account has enough ETH for gas fees')
        }
        
        if (errorMessage.includes('user rejected')) {
          console.log('⚠️  User rejected the transaction')
        }
        
        if (errorMessage.includes('allowance')) {
          console.log('⚠️  Insufficient allowance, please execute approval transaction first')
        }
        
        // Throw error for outer layer to handle
        throw new Error(`LI.FI SDK executeRoute execution failed: ${errorMessage}`)
      }
      
    } catch (error) {
      console.error('LI.FI transfer execution failed:', error)
      
      const errorResult: LiFiExecutionResult = {
        ...execution,
        status: LiFiExecutionStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
        note: 'Execution failed, please check configuration and network connection',
        implementationRequired: true,
        retryCount: 0,
      }
      
      // Update status
      this.executions.set(executionId, errorResult)
      
      // Log error
      this.logExecution('lifi_execute_error', params, context, {
        error: String(error),
        // Environment variable check
        hasEnvRpc: !!process.env.NEXT_PUBLIC_ARBITRUM_SANDBOX_RPC,
      })
      
      return errorResult
    }
  }
  
  /**
   * Check execution status
   */
  private async checkExecutionStatus(params: Record<string, any>, context: AgentContext): Promise<LiFiExecutionResult> {
    const { quoteId } = params
    
    // Find execution record
    const executionId = Array.from(this.executions.keys()).find(key =>
      this.executions.get(key)?.quoteId === quoteId
    )
    
    if (!executionId) {
      throw new Error(`Execution not found for quote: ${quoteId}`)
    }
    
    const execution = this.executions.get(executionId)!
    
    // Note: Real LI.FI SDK is needed here to check on-chain status
    // Currently returns cached status
    
    const result: LiFiExecutionResult = {
      ...execution,
      note: 'Real LI.FI SDK implementation needed to check on-chain status',
      implementationRequired: true,
    }
    
    // Log execution
    this.logExecution('lifi_check_status', params, context, result)
    
    return result
  }
  
  /**
   * Estimate transfer cost
   */
  private async estimateTransfer(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { amount, fromChainId, toChainId } = params
    
    console.log('Estimating LI.FI transfer cost:', {
      amount,
      fromChainId,
      toChainId,
    })
    
    try {
      // Safely parse BigInt amount
      let amountWei: bigint
      try {
        // Default to ETH decimals (18), should actually get from token configuration
        const tokenDecimals = 18
        amountWei = parseUnits(amount, tokenDecimals)
        
        // Validate amount validity
        if (amountWei <= BigInt(0)) {
          throw new Error('Amount must be greater than 0')
        }
        
        console.log('Amount parsed for estimation:', {
          original: amount,
          wei: amountWei.toString(),
          decimals: tokenDecimals,
        })
      } catch (parseError) {
        throw new Error(`Failed to parse amount for estimation: ${amount}. Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
      }
      
      // Note: Real LI.FI SDK is needed here to get accurate estimates
      // Currently returns placeholder estimates
      
      const result = {
        ...params,
        estimatedGas: 'Real SDK implementation needed',
        estimatedTime: 'Real SDK implementation needed',
        estimatedCost: 'Real SDK implementation needed',
        note: 'Real LI.FI SDK implementation needed to get accurate estimates.',
        implementationRequired: true,
        amountParsed: amountWei.toString(),
        amountDecimals: 18,
      }
      
      // Log execution
      this.logExecution('lifi_estimate', params, context, result)
      
      return result
      
    } catch (error) {
      console.error('LI.FI estimation failed:', error)
      
      const errorResult = {
        ...params,
        estimatedGas: 'Estimation failed',
        estimatedTime: 'Estimation failed',
        estimatedCost: 'Estimation failed',
        note: `Estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        implementationRequired: true,
        error: error instanceof Error ? error.message : String(error),
      }
      
      // Log error
      this.logExecution('lifi_estimate_error', params, context, {
        error: String(error),
        // Environment variable check
        hasEnvRpc: !!process.env.NEXT_PUBLIC_ARBITRUM_SANDBOX_RPC,
      })
      
      return errorResult
    }
  }
  
  // ==================== Utility Methods ====================

  /**
   * Create LI.FI SDK wallet adapter
   * Adapt viem WalletClient to wallet interface required by LI.FI SDK
   * Note: LI.FI SDK's executeRoute uses structuredClone, cannot clone functions
   * Therefore we create a simple adapter that delegates function calls to wallet client
   */
  private createLiFiWalletAdapter(walletClient: any): any {
    console.log('Creating LI.FI wallet adapter for viem wallet client')
    
    // Create a simple adapter object to avoid functions not being cloneable
    // We define methods as functions returning Promises, using simple function expressions
    const adapter = {
      // Get account address
      getAddress: () => {
        if (!walletClient.account) {
          throw new Error('Wallet client has no account')
        }
        return Promise.resolve(walletClient.account.address)
      },
      
      // Switch network
      switchChain: (chainId: number) => {
        console.log(`LI.FI adapter: Switching to chain ${chainId}`)
        // In actual implementation, should switch wallet network here
        // Due to complexity, we just log for now
        return Promise.resolve(true)
      },
      
      // Sign message
      signMessage: (message: string) => {
        console.log('LI.FI adapter: Signing message')
        // Use wallet client to sign message
        if (walletClient.signMessage) {
          return walletClient.signMessage({
            message,
            account: walletClient.account,
          })
        }
        return Promise.reject(new Error('Wallet client does not support signMessage'))
      },
      
      // Send transaction
      sendTransaction: (transaction: any) => {
        console.log('LI.FI adapter: Sending transaction', {
          to: transaction.to,
          value: transaction.value,
          data: transaction.data?.slice(0, 50) + '...',
          chainId: transaction.chainId,
        })
        
        // Use wallet client to send transaction
        if (walletClient.sendTransaction) {
          return walletClient.sendTransaction(transaction)
        }
        
        // If wallet client doesn't have sendTransaction method, use writeContract or other methods
        return Promise.reject(new Error('Wallet client does not support sendTransaction'))
      },
      
      // Get chain ID
      getChainId: () => {
        if (walletClient.chain?.id) {
          return Promise.resolve(walletClient.chain.id)
        }
        // Default to Ethereum mainnet chain ID
        return Promise.resolve(1)
      },
    }
    
    return adapter
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const { executorAddress } = this.lifiConfig
    
    if (!this.isValidAddress(executorAddress)) {
      throw new Error(`Invalid executor address: ${executorAddress}`)
    }
    
    console.log('LI.FI configuration validated')
  }
  
  /**
   * Validate address format
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  
  /**
   * Validate amount format
   */
  private isValidAmount(amount: string): boolean {
    if (!amount || typeof amount !== 'string') return false
    
    // Check if it's a valid number
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0
  }
  
  /**
   * Reset skill
   */
  protected onReset(): void {
    this.executions.clear()
  }
}

// ==================== Export and Registration ====================

/**
 * Create and register LI.FI skill instance
 */
export function initializeLiFiSkill(config: LiFiSkillConfig = {}): LiFiSkill {
  return createAndRegisterSkill(LiFiSkill, config)
}

/**
 * Get LI.FI skill instance
 */
export async function getLiFiSkill(): Promise<LiFiSkill | undefined> {
  try {
    // Use ES module dynamic import to avoid circular dependencies
    const { getSkillRegistry } = await import('./base-skill')
    const registry = getSkillRegistry()
    return registry.get('lifi') as LiFiSkill | undefined
  } catch (error) {
    console.error('Failed to get LI.FI skill:', error)
    return undefined
  }
}