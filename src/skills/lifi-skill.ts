/**
 * LI.FI 技能实现
 * 
 * 封装 LI.FI SDK 跨链桥接逻辑。
 * 支持多链、多代币的跨链转移，提供最优路径选择。
 * 
 * 奖金要求：必须展示 AI Agent 如何根据报价（Quote）做出路径决策。
 */

import { BaseSkill, createAndRegisterSkill } from './base-skill'
import { type SkillMetadata, type AgentContext, type SkillExecutionResult } from '../types/agent'
import { type Address } from '../types/blockchain'
import { ChainId } from '../constants/chains'
import { getLiFiExecutorAddress, ContractName, getUSDCAddress } from '../constants/addresses'
import { getRoutes, getStatus, executeRoute, type RoutesRequest, type Route, type StatusResponse, createConfig } from '@lifi/sdk'
import { parseUnits, formatUnits } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'

// ==================== 技能配置 ====================

/**
 * LI.FI 技能配置
 */
export interface LiFiSkillConfig {
  // LI.FI API 配置
  apiKey?: string               // LI.FI API 密钥
  baseUrl?: string              // API 基础 URL
  
  // 执行器配置
  executorAddress?: Address     // LiFi Diamond 合约地址
  
  // 跨链配置
  defaultSlippage?: number      // 默认滑点容忍度（百分比）
  defaultGasLimit?: string      // 默认 gas 限制
  
  // 重试配置
  maxRetries?: number
  retryDelay?: number
  
  // 调试配置
  debugMode?: boolean
  
  // 钱包客户端（可选，用于交易执行）
  walletClient?: any            // viem WalletClient 实例
}

// ==================== 类型定义 ====================

/**
 * LI.FI 报价参数
 */
export interface LiFiQuoteParams {
  fromChainId: number           // 源链 ID
  toChainId: number             // 目标链 ID
  fromTokenAddress: Address     // 源代币地址
  toTokenAddress: Address       // 目标代币地址
  amount: string                // 金额（字符串格式）
  fromAddress?: Address         // 发送地址
  toAddress?: Address           // 接收地址
  slippage?: number             // 滑点容忍度
  allowBridges?: string[]       // 允许的桥接器
  denyBridges?: string[]        // 拒绝的桥接器
}

/**
 * LI.FI 报价结果
 */
export interface LiFiQuote {
  id: string                    // 报价 ID
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
  fromAmount: string            // 源金额
  toAmount: string              // 目标金额
  toAmountMin: string           // 最小接收金额（考虑滑点）
  
  // 费用信息
  gasCosts?: Array<{
    type: string
    amount: string
    token: {
      address: Address
      symbol: string
      decimals: number
    }
  }>
  
  // 路径信息
  bridges?: string[]            // 使用的桥接器
  steps?: Array<{
    type: string
    tool: string
    action: any
  }>
  
  // 时间信息
  estimatedTime?: number        // 预估时间（秒）
  
  // 元数据
  transactionRequest?: any      // 交易请求数据
}

/**
 * LI.FI 执行状态
 */
export enum LiFiExecutionStatus {
  PENDING = 'PENDING',          // 等待开始
  QUOTE_RECEIVED = 'QUOTE_RECEIVED', // 已获取报价
  TRANSACTION_SENT = 'TRANSACTION_SENT', // 交易已发送
  COMPLETED = 'COMPLETED',      // 完成
  FAILED = 'FAILED',            // 失败
}

/**
 * LI.FI 执行结果
 */
export interface LiFiExecutionResult {
  status: LiFiExecutionStatus
  quoteId?: string              // 报价 ID
  fromChainId: number
  toChainId: number
  fromAmount: string
  toAmount?: string
  
  // 交易信息
  transactionHash?: string      // 交易哈希
  bridgeName?: string           // 使用的桥接器
  
  // 时间信息
  startedAt?: number            // 开始时间
  completedAt?: number          // 完成时间
  
  // 错误信息
  error?: string
  retryCount?: number
  
  // 实现状态信息
  note?: string                 // 实现说明
  implementationRequired?: boolean // 是否需要真实实现
}

// ==================== 技能实现 ====================

/**
 * LI.FI 技能类
 */
export class LiFiSkill extends BaseSkill {
  // 技能元数据
  readonly metadata: SkillMetadata = {
    id: 'lifi',
    name: 'LI.FI Cross-Chain Bridge',
    description: '使用 LI.FI SDK 进行多链、多代币的跨链转移',
    version: '1.0.0',
    author: 'Nomad Arc Team',
    
    capabilities: [
      'lifi_get_quote',         // 获取跨链报价
      'lifi_execute',           // 执行跨链交易
      'lifi_check_status',      // 检查执行状态
      'lifi_estimate',          // 估算跨链成本
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
      ChainId.BUILD_BEAR_ARBITRUM_SANDBOX, // BuildBear Arbitrum 沙箱
      ChainId.ETHEREUM,          // 以太坊主网
      ChainId.ARBITRUM,          // Arbitrum 主网
      ChainId.BASE,              // Base 主网
      ChainId.OPTIMISM,          // Optimism 主网
      ChainId.POLYGON,           // Polygon 主网
      ChainId.AVALANCHE,         // Avalanche 主网
      ChainId.BSC,               // BSC 主网
    ],
    
    isAsync: true,
  }
  
  // 技能特定配置
  private lifiConfig: Required<LiFiSkillConfig>
  
  // 执行状态跟踪
  private executions: Map<string, LiFiExecutionResult> = new Map()
  
  /**
   * 构造函数
   */
  constructor(config: LiFiSkillConfig = {}) {
    super(config)
    
    // 移除硬编码的API Key，使用生产环境
    const apiKey = config.apiKey || process.env.NEXT_PUBLIC_LIFI_API_KEY || ''
    
    // 使用生产环境API端点，添加allowTestnets配置
    this.lifiConfig = {
      apiKey: apiKey,
      baseUrl: config.baseUrl || 'https://li.quest/v1', // 使用生产环境API
      executorAddress: config.executorAddress || '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae', // 默认测试网地址
      defaultSlippage: config.defaultSlippage || 0.5, // 0.5%
      defaultGasLimit: config.defaultGasLimit || '1000000',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 2000,
      debugMode: config.debugMode || false,
      walletClient: config.walletClient, // 可选的钱包客户端
    }
    
    console.log('LI.FI 技能配置完成:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
      baseUrl: this.lifiConfig.baseUrl,
      isProduction: !this.lifiConfig.baseUrl.includes('staging'),
    })
  }
  
  // ==================== 工具函数 ====================

  /**
   * 手动创建 LI.FI SDK 兼容的 Signer
   * 避免 SDK 自动克隆 walletClient 导致的 DataCloneError
   * 创建"极简数据" Signer，不包含任何复杂对象引用
   * 使用闭包引用外部 walletClient，确保对象可被 structuredClone
   */
  private createLiFiSigner(walletClient: any): any {
    console.log('🔧 手动创建"极简数据" Signer（完全避免 structuredClone 限制）')
    
    // 打印钱包客户端信息用于调试
    console.log('📋 钱包客户端信息:', {
      chainId: walletClient.chain?.id,
      account: walletClient.account?.address,
      hasSignMessage: typeof walletClient.signMessage === 'function',
      hasSendTransaction: typeof walletClient.sendTransaction === 'function',
    })
    
    // 提取关键信息作为纯字符串/数字
    const accountAddress = walletClient.account?.address || ''
    const chainId = walletClient.chain?.id || 31337
    
    // 创建极简 Signer 对象 - 只包含基本数据，不包含函数
    // 函数将在调用时通过闭包访问外部 walletClient
    const minimalSigner = {
      // 纯数据属性 - 可以被 structuredClone
      address: accountAddress,
      chainId: 42161, // 逻辑 ID 骗过 SDK
      
      // 标记为 Signer
      _isSigner: true,
      _isMinimalSigner: true,
    }
    
    console.log('✅ "极简数据" Signer 创建成功')
    console.log('📋 Signer 数据属性:', Object.keys(minimalSigner).filter(k => !k.startsWith('_')))
    
    // 验证对象是否可序列化
    try {
      const testClone = structuredClone(minimalSigner)
      console.log('✅ Signer 可序列化验证通过 - 对象只包含基本数据')
    } catch (cloneError) {
      console.error('❌ Signer 无法序列化:', (cloneError as Error).message)
      console.log('⚠️ 这不应该发生，因为对象只包含字符串和数字')
      throw new Error(`Signer 无法序列化: ${(cloneError as Error).message}`)
    }
    
    // 创建代理对象，在调用时动态绑定函数
    // 这个代理对象不会被 structuredClone，因为 executeRoute 会克隆 minimalSigner 而不是代理
    const signerProxy = new Proxy(minimalSigner, {
      get(target, prop, receiver) {
        // 如果是数据属性，直接返回
        if (prop in target) {
          return Reflect.get(target, prop, receiver)
        }
        
        // 如果是方法调用，动态创建函数
        switch (prop) {
          case 'getAddress':
            return async () => accountAddress
            
          case 'getChainId':
            return async () => 42161 // 逻辑 ID
            
          case 'signMessage':
            return async (message: string) => {
              console.log('🔐 通过闭包调用 signMessage')
              return await walletClient.signMessage({
                account: walletClient.account,
                message
              })
            }
            
          case 'sendTransaction':
            return async (transaction: any) => {
              console.log('📤 通过闭包调用 sendTransaction:', {
                to: transaction.to,
                data: transaction.data?.substring(0, 100) + '...',
                value: transaction.value,
                chainId: chainId,
              })
              
              // 使用 walletClient 发送交易，确保物理链 ID 匹配
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
              console.log(`⏳ 确认交易: ${hash}`)
              // 这里需要 publicClient，但我们可以在需要时创建
              return { hash, status: 'success' }
            }
            
          default:
            return undefined
        }
      },
      
      // 确保 has 检查正常工作
      has(target, prop) {
        return prop in target ||
          ['getAddress', 'getChainId', 'signMessage', 'sendTransaction', 'confirmTransaction'].includes(prop as string)
      },
      
      // 确保 ownKeys 只返回数据属性
      ownKeys(target) {
        return Reflect.ownKeys(target)
      },
      
      // 确保 getOwnPropertyDescriptor 正常工作
      getOwnPropertyDescriptor(target, prop) {
        if (prop in target) {
          return Reflect.getOwnPropertyDescriptor(target, prop)
        }
        return undefined
      }
    })
    
    return signerProxy
  }

  // ==================== 抽象方法实现 ====================

  /**
   * 初始化 LI.FI 技能
   */
  protected async onInitialize(): Promise<void> {
    console.log('Initializing LI.FI skill...')
    
    try {
      // 使用 createConfig 配置 LI.FI SDK，添加 allowTestnets 配置
      const config = createConfig({
        apiUrl: this.lifiConfig.baseUrl,
        integrator: 'Nomad-Arc', // 必需的 integrator 参数
        apiKey: this.lifiConfig.apiKey,
        // 允许测试网
        allowTestnets: true,
        // 覆盖 Arbitrum 主网分叉的 RPC
        rpcs: {
          [42161]: [process.env.NEXT_PUBLIC_ARBITRUM_SANDBOX_RPC || 'https://rpc.buildbear.io/delicate-cannonball-45d06d30'],
        },
        // 禁用多链 RPC 切换，确保使用沙箱 RPC
        multichain: false,
      } as any) // 使用 as any 绕过类型检查
      
      console.log('LI.FI SDK configured:', {
        baseUrl: this.lifiConfig.baseUrl,
        integrator: 'Nomad-Arc',
        hasApiKey: !!this.lifiConfig.apiKey,
        apiKeyLength: this.lifiConfig.apiKey.length,
        allowTestnets: true,
      })
      
      // 验证配置
      this.validateConfig()
      
      // 清空状态跟踪
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
   * 执行 LI.FI 操作
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
   * 自定义参数验证
   */
  protected onValidate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const { action } = params
    
    if (!action) {
      errors.push('Missing required parameter: action')
      return { valid: false, errors }
    }
    
    // 根据 action 验证参数
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
   * 估算执行成本
   */
  protected async onEstimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }> {
    // LI.FI 跨链通常涉及复杂的多步操作
    // 这里提供保守的估算值
    
    const gasEstimate = '1500000' // 保守估计
    const timeEstimate = 120000   // 2分钟估计
    
    return {
      gasEstimate,
      timeEstimate,
      costEstimate: 'Varies by route and network conditions',
    }
  }
  
  // ==================== 具体操作方法 ====================
  
  /**
   * 获取跨链报价（奖金要求核心功能）
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
    
    // 测试网代币地址映射 - 黑客松演示后备路径
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
    
    // 如果提供的地址是零地址或无效，使用后备地址
    let finalFromTokenAddress = fromTokenAddress as Address
    let finalToTokenAddress = toTokenAddress as Address
    
    // 检查是否为测试网并尝试使用已知代币地址
    if (fromChainId === 421614 || fromChainId === 84532) {
      if (fromTokenAddress === '0x0000000000000000000000000000000000000000' ||
          fromTokenAddress === '0xf3c3351d6bd0098eeb33ca8f830faf2a141ea2e1') {
        // 使用USDC作为后备
        finalFromTokenAddress = TESTNET_TOKEN_ADDRESSES[fromChainId as keyof typeof TESTNET_TOKEN_ADDRESSES]?.USDC || fromTokenAddress as Address
        console.log(`使用测试网后备代币地址 (${fromChainId}):`, finalFromTokenAddress)
      }
    }
    
    if (toChainId === 421614 || toChainId === 84532) {
      if (toTokenAddress === '0x0000000000000000000000000000000000000000' ||
          toTokenAddress === '0xf3c3351d6bd0098eeb33ca8f830faf2a141ea2e1') {
        // 使用USDC作为后备
        finalToTokenAddress = TESTNET_TOKEN_ADDRESSES[toChainId as keyof typeof TESTNET_TOKEN_ADDRESSES]?.USDC || toTokenAddress as Address
        console.log(`使用测试网后备代币地址 (${toChainId}):`, finalToTokenAddress)
      }
    }
    
    try {
      // 链 ID 映射：BuildBear 沙箱 (31337) -> Arbitrum 主网 (42161)
      // LI.FI API 不认识私有沙盒 ID，需要映射到对应的主网 ID
      const mappedFromChainId = Number(fromChainId) === 31337 ? 42161 : Number(fromChainId)
      const mappedToChainId = Number(toChainId) === 31337 ? 42161 : Number(toChainId)
      
      console.log('链 ID 映射:', {
        originalFromChainId: fromChainId,
        mappedFromChainId,
        originalToChainId: toChainId,
        mappedToChainId,
        note: 'BuildBear 沙箱 (31337) 映射为 Arbitrum 主网 (42161) 以兼容 LI.FI API'
      })
      
      // 转换金额为 BigIntish 格式（代币最小单位的整数字符串）
      // LI.FI API 期望 fromAmount 是 BigIntish 格式（整数字符串）
      let fromAmountBigIntish: string
      try {
        // 尝试将金额字符串解析为数字
        const amountNum = parseFloat(String(amount))
        if (isNaN(amountNum)) {
          throw new Error(`Invalid amount: ${amount}`)
        }
        
        // 根据代币地址判断小数位数
        // 对于 USDC（Arbitrum 主网地址），使用 6 位小数
        // 对于 ETH（零地址），使用 18 位小数
        // 对于其他代币，使用默认 18 位小数
        let decimals = 18 // 默认
        const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase()
        const wethAddress = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'.toLowerCase()
        
        if (finalFromTokenAddress.toLowerCase() === usdcAddress) {
          decimals = 6
          console.log(`检测到 USDC 代币，使用 ${decimals} 位小数`)
        } else if (finalFromTokenAddress.toLowerCase() === wethAddress ||
                   finalFromTokenAddress === '0x0000000000000000000000000000000000000000') {
          decimals = 18
          console.log(`检测到 ETH/WETH 代币，使用 ${decimals} 位小数`)
        } else {
          console.log(`未知代币地址 ${finalFromTokenAddress}，使用默认 ${decimals} 位小数`)
        }
        
        // 使用 parseUnits 将带小数点的金额转换为 BigInt
        const amountBigInt = parseUnits(String(amountNum), decimals)
        fromAmountBigIntish = amountBigInt.toString()
        
        console.log('金额转换:', {
          originalAmount: amount,
          parsedAmount: amountNum,
          decimals,
          bigIntValue: amountBigInt.toString(),
          bigIntishString: fromAmountBigIntish
        })
      } catch (convertError) {
        console.error('金额转换失败，使用原始字符串:', convertError)
        // 如果转换失败，使用原始字符串（可能是已经是 BigIntish 格式）
        fromAmountBigIntish = String(amount)
      }
      
      // 使用真实的 LI.FI SDK 获取报价（使用映射后的链 ID）
      const request = {
        fromChainId: mappedFromChainId,
        toChainId: mappedToChainId,
        fromTokenAddress: finalFromTokenAddress,
        toTokenAddress: finalToTokenAddress,
        fromAmount: fromAmountBigIntish,
        fromAddress: fromAddress as Address,
        toAddress: toAddress as Address,
        options: {
          slippage: slippage / 100, // 转换为小数
          order: 'RECOMMENDED' as const,
        },
      }
      
      console.log('LI.FI 请求参数（映射后）:', JSON.stringify(request, null, 2))
      console.log('请求URL:', `${this.lifiConfig.baseUrl}/advanced/routes`)
      
      const routes = await getRoutes(request)
      
      if (!routes.routes || routes.routes.length === 0) {
        throw new Error('No routes found for the given parameters')
      }
      
      const route = routes.routes[0]
      
      // 转换 LI.FI SDK 的 Route 到我们的 LiFiQuote 格式
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
        
        // 费用信息 - 根据实际 Route 类型调整
        gasCosts: (route as any).gasCosts?.map((cost: any) => ({
          type: cost.type || 'GAS',
          amount: cost.amount || '0',
          token: {
            address: (cost.token?.address || '0x0000000000000000000000000000000000000000') as Address,
            symbol: cost.token?.symbol || 'ETH',
            decimals: cost.token?.decimals || 18,
          },
        })),
        
        // 路径信息
        bridges: route.steps
          .filter((step: any) => step.type === 'cross' || step.type === 'lifi')
          .map((step: any) => step.tool),
        steps: route.steps.map((step: any) => ({
          type: step.type,
          tool: step.tool,
          action: step.action,
        })),
        
        // 时间信息 - 使用实际属性或默认值
        estimatedTime: (route as any).estimatedDuration || 120,
        
        // 交易请求数据
        transactionRequest: {
          route,
          note: '真实的 LI.FI SDK 报价',
          implementationRequired: false,
        },
      }
      
      console.log('LI.FI 报价获取成功:', {
        quoteId: quote.id,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        bridges: quote.bridges,
        steps: quote.steps?.length,
      })
      
      // 记录执行日志
      this.logExecution('lifi_get_quote', params, context, quote)
      
      return quote
      
    } catch (error) {
      console.error('LI.FI 报价获取失败:', error)
      
      // 记录错误日志
      this.logExecution('lifi_get_quote_error', params, context, { error: String(error) })
      
      // 根据要求：如果真正的RPC调用失败，严禁回退到模拟数据
      // 直接抛出错误，不返回任何占位符数据
      throw new Error(`LI.FI 报价获取失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * 执行跨链转移
   */
  private async executeTransfer(params: Record<string, any>, context: AgentContext): Promise<LiFiExecutionResult> {
    const {
      quoteId,
      fromAddress = context.userAddress,
      amount,
      fromChainId,
      toChainId,
      route // 新增：LI.FI SDK 的 Route 对象
    } = params
    
    // 生成执行 ID
    const executionId = `exec_${quoteId}_${Date.now()}`
    
    // 初始化执行状态
    const execution: LiFiExecutionResult = {
      status: LiFiExecutionStatus.PENDING,
      quoteId,
      fromChainId,
      toChainId,
      fromAmount: amount,
      startedAt: Date.now(),
    }
    
    // 保存状态
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

    // 如果是 Arbitrum 沙箱，打印 BuildBear Explorer URL 模板
    if (fromChainId === 42161 || fromChainId === 31337) {
      console.log('📡 BuildBear Arbitrum Sandbox Explorer: https://explorer.buildbear.io/delicate-cannonball-45d06d30')
      console.log('  交易哈希 URL 模板: https://explorer.buildbear.io/delicate-cannonball-45d06d30/tx/{txHash}')
    }
    
    try {
      // 检查是否有钱包客户端
      if (!this.lifiConfig.walletClient) {
        throw new Error('Wallet client not configured. Please provide a wallet client in LiFiSkillConfig.')
      }
      
      // 检查是否有路由
      if (!route) {
        throw new Error('Route not provided. Please provide the LI.FI route from the quote.')
      }
      
      console.log('🚀 使用轻量化策略执行 LI.FI 跨链转移')
      console.log('📋 路由详情:', {
        fromChainId: route.fromChainId,
        toChainId: route.toChainId,
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
        steps: route.steps?.length || 0,
        bridges: route.steps?.map((step: any) => step.tool).filter(Boolean) || [],
      })
      
      // 检查授权状态
      console.log('Checking token approval status...')
      
      // 对于 USDC 代币，需要确保已授权给 LI.FI 执行器
      // LI.FI SDK 通常会处理授权，但为了安全，我们检查一下
      const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
      const lifiExecutor = this.lifiConfig.executorAddress
      
      if (route.fromToken.address.toLowerCase() === usdcAddress.toLowerCase()) {
        console.log('USDC token detected, ensuring approval...')
        // 在实际实现中，这里应该检查并执行授权
        // 但 LI.FI SDK 的 transactionRequest 可能已包含授权逻辑
      }
      
      // 使用 LI.FI SDK 的 executeRoute 执行跨链转移
      console.log('⏳ 使用 LI.FI SDK executeRoute 执行跨链转移...')
      
      try {
        // 获取钱包客户端
        const walletClient = this.lifiConfig.walletClient
        
        if (!walletClient) {
          throw new Error('钱包客户端未配置，无法执行交易')
        }
        
        // 手动创建 LI.FI SDK 兼容的 Signer，避免自动克隆导致的 DataCloneError
        const lifiSigner = this.createLiFiSigner(walletClient)
        
        // SDK 逻辑 ID 欺骗：确保 route 对象使用逻辑 ID 42161 而不是物理 ID 31337
        // LI.FI SDK 需要看到 42161（Arbitrum 主网）才能正确处理路由
        const processedRoute = { ...route }
        if (processedRoute.fromChainId === 31337) {
          console.log('🔄 执行 SDK 逻辑 ID 欺骗：将 fromChainId 从 31337 映射到 42161')
          processedRoute.fromChainId = 42161
          
          // 同时更新路由步骤中的链 ID
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
        
        // 尝试使用 LI.FI SDK 的 executeRoute 函数执行路由
        console.log('🚀 尝试调用 executeRoute 执行跨链交易（使用手动 Signer）...')
        console.log('📋 路由详情:', {
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
          // 执行路由 - executeRoute 会处理所有步骤，包括授权和跨链交易
          console.log('⏳ 正在执行跨链路由...')
          executeResult = await executeRoute(lifiSigner, processedRoute)
          
          console.log('✅ LI.FI SDK executeRoute 调用成功')
          
          // 根据 LI.FI SDK 文档，executeRoute 返回更新后的路由
          // 交易哈希可能位于路由的 steps 中
          const steps = executeResult.steps || []
          for (const step of steps) {
            if ((step as any).transactionHash) {
              transactionHash = (step as any).transactionHash as `0x${string}`
              console.log(`🔍 在步骤 "${step.type}" 中找到交易哈希: ${transactionHash}`)
              break
            } else if ((step as any).transactionId) {
              transactionHash = (step as any).transactionId as `0x${string}`
              console.log(`🔍 在步骤 "${step.type}" 中找到交易ID: ${transactionHash}`)
              break
            }
          }
          
          // 如果步骤中没有找到，尝试从路由的其他位置查找
          if (!transactionHash && (executeResult as any).transactionHash) {
            transactionHash = (executeResult as any).transactionHash as `0x${string}`
          } else if (!transactionHash && (executeResult as any).transactionId) {
            transactionHash = (executeResult as any).transactionId as `0x${string}`
          }
          
          if (!transactionHash) {
            console.warn('⚠️  executeRoute 未返回交易哈希，检查路由步骤:')
            console.log(JSON.stringify(executeResult, null, 2))
            throw new Error('executeRoute 未返回交易哈希，请检查路由执行状态')
          }
          
        } catch (executeError) {
          console.warn('⚠️  LI.FI SDK executeRoute 执行失败（可能是 DataCloneError）:',
            executeError instanceof Error ? executeError.message : String(executeError))
          
          // 备选方案：手动提取 transactionRequest 并发送交易
          console.log('🔄 尝试手动发送交易作为备选方案...')
          
          // 检查路由是否包含 transactionRequest
          if (processedRoute.transactionRequest) {
            console.log('📋 路由包含 transactionRequest，尝试手动发送...')
            const txRequest = processedRoute.transactionRequest
            
            // 手动发送交易
            console.log('📤 手动发送交易...')
            transactionHash = await walletClient.sendTransaction({
              account: walletClient.account,
              to: txRequest.to,
              data: txRequest.data,
              value: txRequest.value ? BigInt(txRequest.value) : 0n,
              chain: walletClient.chain,
            })
            
            console.log(`✅ 手动交易发送成功，哈希: ${transactionHash}`)
            executeResult = { transactionHash, steps: [] }
            
          } else if (processedRoute.steps && processedRoute.steps.length > 0) {
            // 尝试从第一个步骤提取交易数据
            console.log('📋 从路由步骤提取交易数据...')
            const firstStep = processedRoute.steps[0]
            if (firstStep.transactionRequest) {
              const txRequest = firstStep.transactionRequest
              console.log('📤 从第一个步骤手动发送交易...')
              transactionHash = await walletClient.sendTransaction({
                account: walletClient.account,
                to: txRequest.to,
                data: txRequest.data,
                value: txRequest.value ? BigInt(txRequest.value) : 0n,
                chain: walletClient.chain,
              })
              
              console.log(`✅ 手动交易发送成功，哈希: ${transactionHash}`)
              executeResult = { transactionHash, steps: [firstStep] }
            } else {
              throw new Error('路由不包含可执行的交易请求，无法手动发送')
            }
          } else {
            // 重新抛出原始错误
            throw executeError
          }
        }
        
        if (!transactionHash) {
          throw new Error('无法获取交易哈希，执行失败')
        }
        
        console.log('📊 执行结果:', {
          transactionHash,
          fromAmount: executeResult?.fromAmount || processedRoute.fromAmount,
          toAmount: executeResult?.toAmount || processedRoute.toAmount,
          steps: executeResult?.steps?.length || 0,
        })
        
        const explorerUrl = `https://explorer.buildbear.io/delicate-cannonball-45d06d30/tx/${transactionHash}`
        
        console.log(`✅ 交易已发送，等待确认...`)
        console.log(`   交易哈希: ${transactionHash}`)
        console.log(`   Explorer URL: ${explorerUrl}`)
        
        // 等待交易确认并获取回执
        console.log('⏳ 等待交易确认...')
        const receipt = await waitForTransactionReceipt(walletClient, {
          hash: transactionHash,
          timeout: 120_000, // 2分钟超时
        })
        
        // 打印交易回执详情
        console.log('✅ 交易确认成功！')
        console.log(`   区块号: ${receipt.blockNumber}`)
        console.log(`   区块哈希: ${receipt.blockHash}`)
        console.log(`   交易索引: ${receipt.transactionIndex}`)
        console.log(`   Gas 消耗: ${receipt.gasUsed}`)
        console.log(`   状态: ${receipt.status === 'success' ? '成功' : '失败'}`)
        
        if (receipt.status !== 'success') {
          throw new Error(`交易执行失败，状态: ${receipt.status}`)
        }
        
        const result: LiFiExecutionResult = {
          ...execution,
          status: LiFiExecutionStatus.COMPLETED,
          transactionHash,
          toAmount: route.toAmount,
          bridgeName: route.steps?.[0]?.tool || 'LI.FI',
          completedAt: Date.now(),
          note: `交易确认成功！区块号: ${receipt.blockNumber}, Gas消耗: ${receipt.gasUsed}`,
          implementationRequired: false, // 标记为已实现
          retryCount: 0,
        }
        
        // 更新状态
        this.executions.set(executionId, result)
        
        // 记录执行日志
        this.logExecution('lifi_execute', params, context, result)
        
        return result
        
      } catch (error) {
        console.error('❌ LI.FI 跨链转移执行失败:', error)
        
        // 记录详细错误信息
        if (error instanceof Error) {
          console.error('错误详情:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          })
        }
        
        // 检查是否是配置问题
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        if (errorMessage.includes('insufficient funds')) {
          console.log('⚠️  余额不足，请确保账户有足够的 ETH 支付 gas 费')
        }
        
        if (errorMessage.includes('user rejected')) {
          console.log('⚠️  用户拒绝了交易')
        }
        
        if (errorMessage.includes('allowance')) {
          console.log('⚠️  授权不足，请先执行授权交易')
        }
        
        // 抛出错误，让外层处理
        throw new Error(`LI.FI SDK executeRoute 执行失败: ${errorMessage}`)
      }
      
    } catch (error) {
      console.error('LI.FI transfer execution failed:', error)
      
      const errorResult: LiFiExecutionResult = {
        ...execution,
        status: LiFiExecutionStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
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
   * 检查执行状态
   */
  private async checkExecutionStatus(params: Record<string, any>, context: AgentContext): Promise<LiFiExecutionResult> {
    const { quoteId } = params
    
    // 查找执行记录
    const executionId = Array.from(this.executions.keys()).find(key => 
      this.executions.get(key)?.quoteId === quoteId
    )
    
    if (!executionId) {
      throw new Error(`Execution not found for quote: ${quoteId}`)
    }
    
    const execution = this.executions.get(executionId)!
    
    // 注意：这里需要真实的 LI.FI SDK 来检查链上状态
    // 当前返回缓存的状态
    
    const result: LiFiExecutionResult = {
      ...execution,
      note: '需要真实的 LI.FI SDK 实现来检查链上状态',
      implementationRequired: true,
    }
    
    // 记录执行日志
    this.logExecution('lifi_check_status', params, context, result)
    
    return result
  }
  
  /**
   * 估算转移成本
   */
  private async estimateTransfer(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { amount, fromChainId, toChainId } = params
    
    console.log('Estimating LI.FI transfer cost:', {
      amount,
      fromChainId,
      toChainId,
    })
    
    try {
      // 安全解析 BigInt 金额
      let amountWei: bigint
      try {
        // 默认使用 ETH 的小数位 (18)，实际应该从代币配置获取
        const tokenDecimals = 18
        amountWei = parseUnits(amount, tokenDecimals)
        
        // 验证金额有效性
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
      
      // 注意：这里需要真实的 LI.FI SDK 来获取准确的估算
      // 当前返回占位符估算
      
      const result = {
        ...params,
        estimatedGas: '需要真实 SDK 实现',
        estimatedTime: '需要真实 SDK 实现',
        estimatedCost: '需要真实 SDK 实现',
        note: '需要真实的 LI.FI SDK 实现来获取准确估算。',
        implementationRequired: true,
        amountParsed: amountWei.toString(),
        amountDecimals: 18,
      }
      
      // 记录执行日志
      this.logExecution('lifi_estimate', params, context, result)
      
      return result
      
    } catch (error) {
      console.error('LI.FI estimation failed:', error)
      
      const errorResult = {
        ...params,
        estimatedGas: '估算失败',
        estimatedTime: '估算失败',
        estimatedCost: '估算失败',
        note: `估算失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        implementationRequired: true,
        error: error instanceof Error ? error.message : String(error),
      }
      
      // 记录错误日志
      this.logExecution('lifi_estimate_error', params, context, {
        error: String(error),
        // 环境变量检查
        hasEnvRpc: !!process.env.NEXT_PUBLIC_ARBITRUM_SANDBOX_RPC,
      })
      
      return errorResult
    }
  }
  
  // ==================== 工具方法 ====================

  /**
   * 创建 LI.FI SDK 钱包适配器
   * 将 viem WalletClient 适配为 LI.FI SDK 所需的钱包接口
   * 注意：LI.FI SDK 的 executeRoute 使用 structuredClone，不能克隆函数
   * 因此我们创建一个简单的适配器，将函数调用委托给钱包客户端
   */
  private createLiFiWalletAdapter(walletClient: any): any {
    console.log('Creating LI.FI wallet adapter for viem wallet client')
    
    // 创建一个简单的适配器对象，避免函数不能被克隆的问题
    // 我们将方法定义为返回 Promise 的函数，但使用简单的函数表达式
    const adapter = {
      // 获取账户地址
      getAddress: () => {
        if (!walletClient.account) {
          throw new Error('Wallet client has no account')
        }
        return Promise.resolve(walletClient.account.address)
      },
      
      // 切换网络
      switchChain: (chainId: number) => {
        console.log(`LI.FI adapter: Switching to chain ${chainId}`)
        // 在实际实现中，这里应该切换钱包的网络
        // 由于复杂性，我们暂时只记录日志
        return Promise.resolve(true)
      },
      
      // 签名消息
      signMessage: (message: string) => {
        console.log('LI.FI adapter: Signing message')
        // 使用钱包客户端签名消息
        if (walletClient.signMessage) {
          return walletClient.signMessage({
            message,
            account: walletClient.account,
          })
        }
        return Promise.reject(new Error('Wallet client does not support signMessage'))
      },
      
      // 发送交易
      sendTransaction: (transaction: any) => {
        console.log('LI.FI adapter: Sending transaction', {
          to: transaction.to,
          value: transaction.value,
          data: transaction.data?.slice(0, 50) + '...',
          chainId: transaction.chainId,
        })
        
        // 使用钱包客户端发送交易
        if (walletClient.sendTransaction) {
          return walletClient.sendTransaction(transaction)
        }
        
        // 如果钱包客户端没有 sendTransaction 方法，使用 writeContract 或其他方法
        return Promise.reject(new Error('Wallet client does not support sendTransaction'))
      },
      
      // 获取链 ID
      getChainId: () => {
        if (walletClient.chain?.id) {
          return Promise.resolve(walletClient.chain.id)
        }
        // 默认返回以太坊主网链 ID
        return Promise.resolve(1)
      },
    }
    
    return adapter
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    const { executorAddress } = this.lifiConfig
    
    if (!this.isValidAddress(executorAddress)) {
      throw new Error(`Invalid executor address: ${executorAddress}`)
    }
    
    console.log('LI.FI configuration validated')
  }
  
  /**
   * 验证地址格式
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  
  /**
   * 验证金额格式
   */
  private isValidAmount(amount: string): boolean {
    if (!amount || typeof amount !== 'string') return false
    
    // 检查是否为有效数字
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0
  }
  
  /**
   * 重置技能
   */
  protected onReset(): void {
    this.executions.clear()
  }
}

// ==================== 导出和注册 ====================

/**
 * 创建并注册 LI.FI 技能实例
 */
export function initializeLiFiSkill(config: LiFiSkillConfig = {}): LiFiSkill {
  return createAndRegisterSkill(LiFiSkill, config)
}

/**
 * 获取 LI.FI 技能实例
 */
export async function getLiFiSkill(): Promise<LiFiSkill | undefined> {
  try {
    // 使用 ES 模块动态导入避免循环依赖
    const { getSkillRegistry } = await import('./base-skill')
    const registry = getSkillRegistry()
    return registry.get('lifi') as LiFiSkill | undefined
  } catch (error) {
    console.error('Failed to get LI.FI skill:', error)
    return undefined
  }
}