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
import { getQuote, getRoutes, getStatus, executeRoute, type RoutesRequest, type Route, type StatusResponse, createConfig } from '@lifi/sdk'
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
   * Map chain ID for LI.FI API compatibility
   * LI.FI API only supports specific chain IDs, so we need to map unsupported IDs
   */
  private mapChainIdForLiFi(chainId: number): number {
    // LI.FI production API only supports mainnet chain IDs
    // Testnet chain IDs must be mapped to their corresponding mainnet IDs
    const LI_FI_SUPPORTED_MAINNET_IDS = new Set([
      1,      // Ethereum Mainnet
      42161,  // Arbitrum Mainnet
      10,     // Optimism Mainnet
      137,    // Polygon Mainnet
      43114,  // Avalanche Mainnet
      56,     // BSC Mainnet
      8453,   // Base Mainnet
    ]);

    // If chain ID is already a supported mainnet ID, return as-is
    if (LI_FI_SUPPORTED_MAINNET_IDS.has(chainId)) {
      return chainId;
    }

    // Map testnet and unsupported chain IDs to mainnet IDs
    const chainIdMapping: Record<number, number> = {
      // Testnet to Mainnet mappings
      421614: 42161,    // Arbitrum Sepolia -> Arbitrum Mainnet
      84532: 8453,      // Base Sepolia -> Base Mainnet
      11155111: 1,      // Sepolia -> Ethereum Mainnet
      80001: 137,       // Mumbai -> Polygon Mainnet
      5: 1,             // Goerli -> Ethereum Mainnet
      97: 56,           // BSC Testnet -> BSC Mainnet
      
      // Sandbox and custom chain mappings
      31337: 42161,     // BuildBear Arbitrum Sandbox -> Arbitrum Mainnet
      5042002: 42161,   // Circle Arc Testnet -> Arbitrum Mainnet (since LI.FI doesn't support testnets)
    };

    const mappedId = chainIdMapping[chainId];
    if (mappedId) {
      console.log(`🔗 Chain ID mapping: ${chainId} -> ${mappedId} for LI.FI API compatibility`);
      return mappedId;
    }

    // If no mapping found, check if it's already a mainnet ID (even if not in our list)
    // Some mainnet IDs might not be in our list but could still work
    if (chainId < 10000) { // Most mainnet IDs are under 10000
      console.log(`⚠️ Chain ID ${chainId} is not in our known mainnet list, but trying as-is`);
      return chainId;
    }

    // If no mapping found and looks like testnet, default to Arbitrum Mainnet
    console.warn(`⚠️ Chain ID ${chainId} is not supported by LI.FI API, defaulting to Arbitrum Mainnet (42161)`);
    return 42161;
  }

  /**
   * Map chain ID for sandbox compatibility (reverse mapping)
   * When we receive LI.FI routes with mainnet chain IDs, we need to map them back to sandbox IDs
   * for transaction execution in the sandbox environment
   */
  private mapChainIdForSandbox(chainId: number): number {
    // Reverse mapping: mainnet IDs -> sandbox IDs
    const reverseChainIdMapping: Record<number, number> = {
      42161: 31337,     // Arbitrum Mainnet -> BuildBear Arbitrum Sandbox
      1: 31337,         // Ethereum Mainnet -> BuildBear Arbitrum Sandbox (fallback)
      421614: 31337,    // Arbitrum Sepolia -> BuildBear Arbitrum Sandbox
      10: 31337,        // Optimism Mainnet -> BuildBear Arbitrum Sandbox
      137: 31337,       // Polygon Mainnet -> BuildBear Arbitrum Sandbox
      43114: 31337,     // Avalanche Mainnet -> BuildBear Arbitrum Sandbox
      56: 31337,        // BSC Mainnet -> BuildBear Arbitrum Sandbox
      8453: 31337,      // Base Mainnet -> BuildBear Arbitrum Sandbox
    };

    const mappedId = reverseChainIdMapping[chainId];
    if (mappedId) {
      console.log(`🔗 Reverse chain ID mapping: ${chainId} -> ${mappedId} for sandbox compatibility`);
      return mappedId;
    }

    // If no reverse mapping found, check if it's already a sandbox ID
    if (chainId === 31337) {
      return chainId; // Already sandbox ID
    }

    // Default: assume it's a sandbox-compatible ID
    console.log(`ℹ️ Chain ID ${chainId} used as-is for sandbox (no reverse mapping needed)`);
    return chainId;
  }

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
              // 关键修复：使用 walletClient 当前的链 ID，而不是外部的 chainId 变量
              const currentChainId = walletClient.chain?.id
              console.log('📤 Calling sendTransaction via closure:', {
                to: transaction.to,
                data: transaction.data?.substring(0, 100) + '...',
                value: typeof transaction.value === 'bigint' ? transaction.value.toString() : transaction.value,
                walletClientChainId: currentChainId,
                logicalChainId: chainId,
              })
              
              // 使用 walletClient 发送交易，确保物理链 ID 匹配
              // 使用 chainId 参数而不是 chain 对象，避免 ChainMismatchError
              console.log('🔗 代理签名器发送交易，使用 ChainID:', currentChainId)
              
              return await walletClient.sendTransaction({
                account: walletClient.account,
                to: transaction.to,
                data: transaction.data,
                value: transaction.value ? BigInt(transaction.value) : 0n,
                chainId: currentChainId, // 使用当前链 ID 而不是 chain 对象
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
          [42161]: [process.env.NEXT_PUBLIC_ARBITRUM_SANDBOX_RPC || 'https://rpc.buildbear.io/compatible-ironman-b68d3c41'],
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
   * Get routes using proxy API to avoid CORS issues in browser
   */
  private async getRoutesWithProxy(request: any): Promise<any> {
    // Check if we're in browser environment
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
      // Use our proxy API in browser environment
      console.log('📡 Using proxy API for LI.FI request (browser environment)', {
        request: this.safeStringify(request, 2).substring(0, 500) + '...'
      });
      
      try {
        const proxyUrl = '/api/lifi/proxy?endpoint=advanced/routes';
        console.log('📡 Proxy URL:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: this.safeStringify(request),
        });
        
        console.log('📡 Proxy response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('📡 Proxy API error details:', errorText);
          throw new Error(`Proxy API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
        }
        
        const result = await response.json();
        console.log('📡 Proxy API result success:', result.success);
        
        if (!result.success) {
          throw new Error(`Proxy API returned error: ${result.error}`);
        }
        
        return result.data;
      } catch (proxyError: any) {
        console.error('📡 Proxy API failed with error:', proxyError.message);
        // In browser environment, don't fall back to direct SDK call (will fail due to CORS)
        // Instead, re-throw the error with more context
        throw new Error(`LI.FI proxy API failed: ${proxyError.message}. Please check if the proxy server is running.`);
      }
    } else {
      // Server-side or non-browser environment, use direct SDK call
      console.log('🖥️ Using direct LI.FI SDK call (server/non-browser environment)');
      return await getRoutes(request);
    }
  }

  /**
   * Get quote using proxy API to avoid CORS issues in browser
   */
  private async getQuoteWithProxy(request: any): Promise<any> {
    // Check if we're in browser environment
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
      // Use our proxy API in browser environment
      console.log('📡 Using proxy API for LI.FI quote request (browser environment)', {
        request: this.safeStringify(request, 2).substring(0, 500) + '...'
      });
      
      try {
        // Convert request object to query string for GET request
        const queryParams = new URLSearchParams();
        
        // Add all request parameters to query string
        Object.keys(request).forEach(key => {
          const value = request[key];
          if (value !== undefined && value !== null) {
            // Convert to string, handling special cases
            if (typeof value === 'object') {
              queryParams.append(key, this.safeStringify(value));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
        
        const proxyUrl = `/api/lifi/proxy?endpoint=quote&${queryParams.toString()}`;
        console.log('📡 Proxy URL (GET with query params):', proxyUrl);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        console.log('📡 Proxy response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('📡 Proxy API error details:', errorText);
          throw new Error(`Proxy API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
        }
        
        const result = await response.json();
        console.log('📡 Proxy API result success:', result.success);
        
        if (!result.success) {
          throw new Error(`Proxy API returned error: ${result.error}`);
        }
        
        return result.data;
      } catch (proxyError: any) {
        console.error('📡 Proxy API failed with error:', proxyError.message);
        // In browser environment, don't fall back to direct SDK call (will fail due to CORS)
        // Instead, re-throw the error with more context
        throw new Error(`LI.FI proxy API failed: ${proxyError.message}. Please check if the proxy server is running.`);
      }
    } else {
      // Server-side or non-browser environment, use direct SDK call
      console.log('🖥️ Using direct LI.FI SDK getQuote call (server/non-browser environment)');
      return await getQuote(request);
    }
  }

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
    
    // Mainnet token addresses (for mapping when testnet chain IDs are mapped to mainnet)
    const MAINNET_TOKEN_ADDRESSES = {
      // Arbitrum Mainnet
      42161: {
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address,
        WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' as Address,
      },
      // Base Mainnet
      8453: {
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
        WETH: '0x4200000000000000000000000000000000000006' as Address,
      },
      // Ethereum Mainnet
      1: {
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
      },
    }
    
    // Token address mapping from testnet to mainnet (use lowercase keys for case-insensitive lookup)
    const TOKEN_ADDRESS_MAPPING: Record<string, Address> = {
      // Base Sepolia USDC -> Base Mainnet USDC
      '0x036cbd53842c5426634e7929541ec2318f3dcf7e': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      // Arbitrum Sepolia USDC -> Arbitrum Mainnet USDC
      '0x75faf114eafb1bdbe2f0316df893fd58ce46aa1d': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA1d': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      // Base Sepolia WETH -> Base Mainnet WETH
      '0x4200000000000000000000000000000000000006': '0x4200000000000000000000000000000000000006', // Same address
      // Arbitrum Sepolia WETH -> Arbitrum Mainnet WETH
      '0x980b62da83eff3d4576c647993b0c1d7faf17c73': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
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
      // Chain ID mapping for LI.FI API compatibility
      // LI.FI API only supports specific chain IDs, so we need to map unsupported IDs
      const mappedFromChainId = this.mapChainIdForLiFi(Number(fromChainId))
      const mappedToChainId = this.mapChainIdForLiFi(Number(toChainId))
      
      console.log('Chain ID mapping:', {
        originalFromChainId: fromChainId,
        mappedFromChainId,
        originalToChainId: toChainId,
        mappedToChainId,
        note: 'Unsupported chain IDs are mapped to LI.FI compatible IDs'
      })
      
      // Token address mapping for LI.FI API compatibility
      // When chain IDs are mapped, token addresses may also need to be mapped
      let mappedFromTokenAddress = finalFromTokenAddress
      let mappedToTokenAddress = finalToTokenAddress
      
      // Check if token addresses need mapping
      if (TOKEN_ADDRESS_MAPPING[finalFromTokenAddress.toLowerCase()]) {
        mappedFromTokenAddress = TOKEN_ADDRESS_MAPPING[finalFromTokenAddress.toLowerCase()] as Address
        console.log(`🔗 Token address mapping (from): ${finalFromTokenAddress} -> ${mappedFromTokenAddress}`)
      }
      
      if (TOKEN_ADDRESS_MAPPING[finalToTokenAddress.toLowerCase()]) {
        mappedToTokenAddress = TOKEN_ADDRESS_MAPPING[finalToTokenAddress.toLowerCase()] as Address
        console.log(`🔗 Token address mapping (to): ${finalToTokenAddress} -> ${mappedToTokenAddress}`)
      }
      
      // Also check if we should use mainnet token addresses based on mapped chain IDs
      if (MAINNET_TOKEN_ADDRESSES[mappedFromChainId as keyof typeof MAINNET_TOKEN_ADDRESSES]?.USDC &&
          finalFromTokenAddress.toLowerCase().includes('usdc')) {
        // If it's a USDC-like token on a testnet, use mainnet USDC address
        const mainnetUsdc = MAINNET_TOKEN_ADDRESSES[mappedFromChainId as keyof typeof MAINNET_TOKEN_ADDRESSES]?.USDC
        if (mainnetUsdc) {
          mappedFromTokenAddress = mainnetUsdc
          console.log(`🔗 Using mainnet USDC address for chain ${mappedFromChainId}: ${mappedFromTokenAddress}`)
        }
      }
      
      if (MAINNET_TOKEN_ADDRESSES[mappedToChainId as keyof typeof MAINNET_TOKEN_ADDRESSES]?.USDC &&
          finalToTokenAddress.toLowerCase().includes('usdc')) {
        // If it's a USDC-like token on a testnet, use mainnet USDC address
        const mainnetUsdc = MAINNET_TOKEN_ADDRESSES[mappedToChainId as keyof typeof MAINNET_TOKEN_ADDRESSES]?.USDC
        if (mainnetUsdc) {
          mappedToTokenAddress = mainnetUsdc
          console.log(`🔗 Using mainnet USDC address for chain ${mappedToChainId}: ${mappedToTokenAddress}`)
        }
      }
      
      console.log('Final token addresses for LI.FI API:', {
        originalFromToken: finalFromTokenAddress,
        mappedFromToken: mappedFromTokenAddress,
        originalToToken: finalToTokenAddress,
        mappedToToken: mappedToTokenAddress,
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
      
      // Use real LI.FI SDK to get quote (using mapped chain IDs and token addresses)
      // Note: getQuote API uses different parameter names than getRoutes
      const request = {
        fromChain: mappedFromChainId,
        fromToken: mappedFromTokenAddress,
        fromAddress: fromAddress as Address,
        toChain: mappedToChainId,
        toToken: mappedToTokenAddress,
        fromAmount: fromAmountBigIntish,
        toAddress: toAddress as Address,
        slippage: slippage / 100, // Convert to decimal
        order: 'RECOMMENDED' as const,
        allowTransactionRequest: true, // 确保获取交易数据
        integrator: 'Nomad-Arc',
      }
      
      console.log('LI.FI quote request parameters (mapped):', this.safeStringify(request, 2))
      console.log('Request URL:', `${this.lifiConfig.baseUrl}/quote`)
      
      const quoteResponse = await this.getQuoteWithProxy(request)
      
      if (!quoteResponse) {
        throw new Error('No quote received from LI.FI API')
      }
      
      // The quote API returns a single quote object, not an array of routes
      const quoteData = quoteResponse
      
      // Convert LI.FI SDK's Quote to our LiFiQuote format
      const quote: LiFiQuote = {
        id: quoteData.id || `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromChainId: quoteData.fromChain,
        toChainId: quoteData.toChain,
        fromToken: {
          address: (quoteData.fromToken?.address || '0x0000000000000000000000000000000000000000') as Address,
          symbol: quoteData.fromToken?.symbol || 'ETH',
          name: quoteData.fromToken?.name || 'Ethereum',
          decimals: quoteData.fromToken?.decimals || 18,
        },
        toToken: {
          address: (quoteData.toToken?.address || '0x0000000000000000000000000000000000000000') as Address,
          symbol: quoteData.toToken?.symbol || 'ETH',
          name: quoteData.toToken?.name || 'Ethereum',
          decimals: quoteData.toToken?.decimals || 18,
        },
        fromAmount: quoteData.fromAmount,
        toAmount: quoteData.toAmount,
        toAmountMin: quoteData.toAmountMin || quoteData.toAmount,
        
        // Fee information
        gasCosts: quoteData.gasCosts?.map((cost: any) => ({
          type: cost.type || 'GAS',
          amount: cost.amount || '0',
          token: {
            address: (cost.token?.address || '0x0000000000000000000000000000000000000000') as Address,
            symbol: cost.token?.symbol || 'ETH',
            decimals: cost.token?.decimals || 18,
          },
        })),
        
        // Path information
        bridges: quoteData.steps
          ?.filter((step: any) => step.type === 'cross' || step.type === 'lifi')
          .map((step: any) => step.tool) || [],
        steps: quoteData.steps?.map((step: any) => ({
          type: step.type,
          tool: step.tool,
          action: step.action,
        })) || [],
        
        // Time information
        estimatedTime: quoteData.estimatedDuration || 120,
        
        // Transaction request data - quote API should return transactionRequest directly
        transactionRequest: quoteData.transactionRequest || {
          route: quoteData,
          note: 'Real LI.FI SDK quote from /v1/quote endpoint',
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
   * Execute cross-chain transfer - 彻底重写版本
   * 跳过 SDK 的 executeRoute，直接手动发送交易，彻底解决 DataCloneError
   */
  private async executeTransfer(params: Record<string, any>, context: AgentContext): Promise<LiFiExecutionResult> {
    const {
      quoteId,
      fromAddress = context.userAddress,
      amount,
      fromChainId,
      toChainId,
      route // LI.FI SDK Route object from quote
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
    
    console.log('🚀 执行 LI.FI 跨链转账（手动模式）:', {
      executionId,
      quoteId,
      fromAddress,
      fromChainId,
      toChainId,
      amount,
      hasRoute: !!route,
    })

    // Show chain ID mapping information
    const mappedFromChainId = this.mapChainIdForLiFi(fromChainId)
    const mappedToChainId = this.mapChainIdForLiFi(toChainId)
    console.log('🔗 链 ID 映射信息:', {
      原始链ID: { 源链: fromChainId, 目标链: toChainId },
      LI_FI映射后: { 源链: mappedFromChainId, 目标链: mappedToChainId },
      沙盒映射: { 源链: this.mapChainIdForSandbox(mappedFromChainId), 目标链: this.mapChainIdForSandbox(mappedToChainId) }
    })

    // If it's Arbitrum sandbox, print BuildBear Explorer URL template
    if (fromChainId === 42161 || fromChainId === 31337 || mappedFromChainId === 42161 || mappedFromChainId === 31337) {
      console.log('📡 BuildBear Arbitrum 沙盒浏览器: https://explorer.buildbear.io/compatible-ironman-b68d3c41')
      console.log('  交易哈希 URL 模板: https://explorer.buildbear.io/compatible-ironman-b68d3c41/tx/{txHash}')
    }
    
    try {
      // 1. 检查钱包客户端是否存在
      if (!this.lifiConfig.walletClient) {
        throw new Error('钱包客户端未配置。请在 LiFiSkillConfig 中提供钱包客户端。')
      }
      
      // 2. 检查路由是否存在
      if (!route) {
        throw new Error('路由未提供。请提供来自报价的 LI.FI 路由。')
      }
      
      console.log('📋 路由详情:', {
        源链ID: route.fromChainId,
        目标链ID: route.toChainId,
        源金额: route.fromAmount,
        目标金额: route.toAmount,
        步骤数: route.steps?.length || 0,
        桥接器: route.steps?.map((step: any) => step.tool).filter(Boolean) || [],
      })
      
      // 3. 获取钱包客户端
      const walletClient = this.lifiConfig.walletClient
      
      if (!walletClient) {
        throw new Error('钱包客户端未配置，无法执行交易')
      }
      
      // 4. 序列化路由对象，避免任何不可序列化的内容
      console.log('🔄 序列化路由对象...')
      const serializedRoute = JSON.parse(this.safeStringify(route))
      
      // 5. 提取交易数据 - 根据用户要求简化逻辑
      console.log('🔍 开始提取交易数据（简化逻辑）...')
      
      // 定义简化的交易数据提取函数
      const extractTransactionData = (route: any, originalFromChainId: number): { txRequest: any; sourceChainId: number } => {
        console.log('🔍 简化提取交易数据...')
        
        // 用户要求：直接从返回的对象中提取
        // const txRequest = route.transactionRequest || route.steps?.[0]?.transactionRequest;
        const txRequest = route.transactionRequest || (route.steps && route.steps[0] && route.steps[0].transactionRequest)
        
        console.log('📋 提取结果:', {
          hasRouteTransactionRequest: !!route.transactionRequest,
          hasRouteSteps: !!route.steps,
          hasRouteSteps0: !!(route.steps && route.steps[0]),
          hasRouteSteps0TransactionRequest: !!(route.steps && route.steps[0] && route.steps[0].transactionRequest),
          finalTxRequest: !!txRequest,
          targetAddress: txRequest?.to || 'not found',
          routeFromChainId: route.fromChainId,
          originalFromChainId: originalFromChainId
        })
        
        if (txRequest) {
          console.log('✅ 成功提取交易数据')
          console.log('📋 目标地址:', txRequest.to)
          // 使用原始链 ID，而不是路由中的链 ID（路由中的可能是映射后的）
          return {
            txRequest,
            sourceChainId: originalFromChainId
          }
        }
        
        console.error('❌ 无法从任何位置提取交易数据')
        return { txRequest: null, sourceChainId: originalFromChainId }
      }
      
      const { txRequest, sourceChainId } = extractTransactionData(serializedRoute, Number(fromChainId))
      
      // 6. 用户要求：必须校验 to 地址是否存在
      if (!txRequest) {
        throw new Error('无法从 LI.FI 步骤中获取交易请求数据')
      }
      
      if (!txRequest?.to) {
        throw new Error('无法从 LI.FI 步骤中获取目标合约地址(to)')
      }
      
      // 验证交易请求字段
      console.log('🔍 验证交易请求字段...')
      console.log('📋 交易请求对象:', {
        to: txRequest.to,
        data: txRequest.data ? `${txRequest.data.substring(0, 100)}...` : '无',
        value: txRequest.value,
        gasPrice: txRequest.gasPrice,
        gasLimit: txRequest.gasLimit,
        chainId: txRequest.chainId,
      })
      
      // 关键修复：确保 to 地址存在且格式正确
      if (!txRequest.to || !/^0x[a-fA-F0-9]{40}$/.test(txRequest.to)) {
        throw new Error('无法从 LI.FI 步骤中获取有效的目标合约地址(to)')
      }
      
      // 用户要求：确保 to 字段被正确赋值为 txRequest.to as 0x${string}
      const toAddress = txRequest.to as `0x${string}`
      console.log('✅ 目标地址已验证:', toAddress)
      
      // 处理 value 为 BigInt
      const value = txRequest.value ? BigInt(txRequest.value) : 0n
      
      console.log('🔗 链 ID 验证:', {
        路由源链ID: serializedRoute.fromChainId,
        参数源链ID: fromChainId,
        实际源链ID: sourceChainId,
        说明: '交易必须在源链上发送'
      })
      
      // 7. 用户要求：强制链切换 - 在 sendTransaction 之前切换链
      console.log('🔄 检查并切换钱包到源链...')
      try {
        const currentChainId = await walletClient.getChainId()
        console.log('🔗 钱包当前链 ID:', currentChainId, '期望链 ID:', sourceChainId)
        
        if (currentChainId !== sourceChainId) {
          console.log(`🔄 钱包链不匹配，正在切换到源链 ${sourceChainId}...`)
          try {
            // 用户要求：必须调用 walletClient.switchChain({ id: Number(route.fromChainId) })
            await walletClient.switchChain({ id: sourceChainId })
            console.log(`✅ 已切换到链 ${sourceChainId}`)
            // 等待一小段时间让链切换生效
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (switchError) {
            console.warn(`⚠️ 链切换失败: ${switchError instanceof Error ? switchError.message : String(switchError)}`)
            // 继续尝试发送交易，可能会失败，但至少我们尝试过
          }
        } else {
          console.log('✅ 钱包已在正确的源链上')
        }
      } catch (error) {
        console.warn('⚠️ 无法获取钱包当前链 ID，继续发送交易:', error instanceof Error ? error.message : String(error))
      }
      
      // 8. 发送交易
      console.log('🚀 准备发送手动交易:', {
        目标地址: toAddress,
        数据长度: txRequest.data?.length || 0,
        金额: value.toString(),
        源链ID: sourceChainId,
        说明: '使用手动模式发送交易，跳过 SDK 的 executeRoute'
      })
      
      // 关键修复：确保使用正确的链 ID，并添加详细日志
      console.log('🔗 最终发送请求的 ChainID:', sourceChainId)
      console.log('🔗 验证 ChainID 类型:', typeof sourceChainId)
      console.log('🔗 原始参数 fromChainId:', fromChainId)
      
      // 构建交易参数，确保只使用 chainId，不传入 chain 对象
      const transactionParams: any = {
        account: walletClient.account,
        to: toAddress,
        data: txRequest.data,
        value,
        chainId: sourceChainId, // 显式指定源链 ID
      }
      
      // 可选：gasPrice 和 gasLimit
      if (txRequest.gasPrice) {
        transactionParams.gasPrice = BigInt(txRequest.gasPrice)
      }
      if (txRequest.gasLimit) {
        transactionParams.gas = BigInt(txRequest.gasLimit)
      }
      
      console.log('📤 发送交易参数:', this.safeStringify({
        ...transactionParams,
        data: transactionParams.data ? `${transactionParams.data.substring(0, 50)}...` : '无',
        value: transactionParams.value.toString(),
        account: transactionParams.account?.address || '无'
      }, 2))
      
      console.log('📤 发送交易...')
      const transactionHash = await walletClient.sendTransaction(transactionParams)
      
      console.log(`✅ 交易发送成功，哈希: ${transactionHash}`)
      
      const explorerUrl = `https://explorer.buildbear.io/compatible-ironman-b68d3c41/tx/${transactionHash}`
      console.log(`  交易哈希: ${transactionHash}`)
      console.log(`  浏览器 URL: ${explorerUrl}`)
      
      // 9. 等待交易确认
      console.log('⏳ 等待交易确认...')
      const receipt = await waitForTransactionReceipt(walletClient, {
        hash: transactionHash,
        timeout: 120_000, // 2分钟超时
      })
      
      // 打印交易收据详情
      console.log('✅ 交易确认成功!')
      console.log(`   区块号: ${receipt.blockNumber}`)
      console.log(`   区块哈希: ${receipt.blockHash}`)
      console.log(`   交易索引: ${receipt.transactionIndex}`)
      console.log(`   Gas 使用量: ${receipt.gasUsed}`)
      console.log(`   状态: ${receipt.status === 'success' ? '成功' : '失败'}`)
      
      if (receipt.status !== 'success') {
        throw new Error(`交易执行失败，状态: ${receipt.status}`)
      }
      
      // 10. 更新执行状态
      const result: LiFiExecutionResult = {
        ...execution,
        status: LiFiExecutionStatus.COMPLETED,
        transactionHash,
        toAmount: route.toAmount,
        bridgeName: route.steps?.[0]?.tool || 'LI.FI',
        completedAt: Date.now(),
        note: `交易确认成功! 区块号: ${receipt.blockNumber}, Gas 使用量: ${receipt.gasUsed}`,
        implementationRequired: false, // 标记为已实现
        retryCount: 0,
      }
      
      // 更新状态
      this.executions.set(executionId, result)
      
      // 记录执行日志
      this.logExecution('lifi_execute', params, context, result)
      
      return result
      
    } catch (error) {
      console.error('❌ LI.FI 跨链转账执行失败:', error)
      
      // 记录详细错误信息
      if (error instanceof Error) {
        console.error('错误详情:', {
          消息: error.message,
          堆栈: error.stack,
          名称: error.name,
        })
      }
      
      // 检查是否是配置问题
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('insufficient funds')) {
        console.log('⚠️  余额不足，请确保账户有足够的 ETH 支付 gas 费用')
      }
      
      if (errorMessage.includes('user rejected')) {
        console.log('⚠️  用户拒绝了交易')
      }
      
      if (errorMessage.includes('allowance')) {
        console.log('⚠️  授权不足，请先执行授权交易')
      }
      
      // 创建错误结果
      const errorResult: LiFiExecutionResult = {
        ...execution,
        status: LiFiExecutionStatus.FAILED,
        error: errorMessage,
        note: '执行失败，请检查配置和网络连接',
        implementationRequired: true,
        retryCount: 0,
      }
      
      // 更新状态
      this.executions.set(executionId, errorResult)
      
      // 记录错误日志
      this.logExecution('lifi_execute_error', params, context, {
        error: String(error),
        // 环境变量检查
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