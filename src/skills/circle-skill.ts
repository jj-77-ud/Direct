/**
 * Circle CCTP 技能实现
 *
 * 封装 Circle Cross-Chain Transfer Protocol (CCTP) 跨链逻辑。
 * 专门用于 USDC 的安全、快速跨链转移。
 *
 * 奖金要求：必须使用 CCTP 实现 USDC 的跨链转移。
 *
 * 使用官方 @circle-fin/bridge-kit 和 @circle-fin/adapter-viem-v2 进行真实集成。
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

// Circle Bridge Kit 导入
import { BridgeKit, type BridgeChainIdentifier } from '@circle-fin/bridge-kit'
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'

// ==================== 技能配置 ====================

/**
 * Circle CCTP 技能配置
 */
export interface CircleSkillConfig {
  // Circle CCTP 合约地址（通常从 addresses.ts 读取）
  messageTransmitterAddress?: Address
  tokenMessengerAddress?: Address
  
  // 跨链配置
  supportedChains?: number[] // 支持的链列表
  defaultGasLimit?: string   // 默认 gas 限制
  
  // 重试配置
  maxRetries?: number
  retryDelay?: number
  
  // 调试配置
  debugMode?: boolean

  // Bridge Kit 配置
  privateKey?: `0x${string}` // 可选，用于测试的私钥（生产环境应从钱包获取）
}

// 用于 Required 配置的内部类型，其中 privateKey 可以是 undefined
type RequiredCircleSkillConfig = Omit<Required<CircleSkillConfig>, 'privateKey'> & {
  privateKey?: `0x${string}`
}

// ==================== 类型定义 ====================

/**
 * CCTP 跨链参数
 */
export interface CCTPTransferParams {
  fromChainId: number           // 源链 ID
  toChainId: number             // 目标链 ID
  amount: string                // USDC 金额（字符串格式）
  recipient?: Address           // 接收地址（可选，默认当前地址）
  deadline?: number             // 交易截止时间（时间戳）
}

/**
 * CCTP 跨链状态
 */
export enum CCTPTransferStatus {
  PENDING = 'PENDING',          // 等待开始
  INITIATED = 'INITIATED',      // 源链交易已发送
  MESSAGE_SENT = 'MESSAGE_SENT', // 跨链消息已发送
  COMPLETED = 'COMPLETED',      // 目标链交易已完成
  FAILED = 'FAILED',            // 失败
}

/**
 * CCTP 跨链结果
 */
export interface CCTPTransferResult {
  status: CCTPTransferStatus
  fromChainId: number
  toChainId: number
  amount: string
  recipient: Address
  
  // 交易信息
  sourceTxHash?: string         // 源链交易哈希
  messageHash?: string          // 跨链消息哈希
  destinationTxHash?: string    // 目标链交易哈希
  
  // 时间信息
  initiatedAt?: number          // 开始时间
  messageSentAt?: number        // 消息发送时间
  completedAt?: number          // 完成时间
  
  // 错误信息
  error?: string
  retryCount?: number
  
  // 实现状态信息
  note?: string                 // 实现说明
  implementationRequired?: boolean // 是否需要真实实现
}

// ==================== 链 ID 映射 ====================

/**
 * 将项目链 ID 映射到 Bridge Kit 链标识符
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

// ==================== 技能实现 ====================

/**
 * Circle CCTP 技能类
 */
export class CircleSkill extends BaseSkill {
  // 技能元数据
  readonly metadata: SkillMetadata = {
    id: 'circle',
    name: 'Circle CCTP Cross-Chain Transfer',
    description: '使用 Circle CCTP 协议进行 USDC 的安全跨链转移',
    version: '1.0.0',
    author: 'Nomad Arc Team',
    
    capabilities: [
      'cctp_transfer',          // CCTP 跨链转移
      'cctp_status_check',      // 检查跨链状态
      'cctp_estimate',          // 估算跨链成本
    ],
    
    requiredParams: ['fromChainId', 'toChainId', 'amount'],
    optionalParams: ['recipient', 'deadline'],
    
    supportedChains: [
      ChainId.ARBITRUM_SEPOLIA,  // Arbitrum Sepolia（奖金要求）
      ChainId.BASE_SEPOLIA,      // Base Sepolia（奖金要求）
      // 注意：CCTP 还支持其他链，但奖金要求这两个测试网
    ],
    
    isAsync: true,
  }
  
  // 技能特定配置
  private circleConfig: RequiredCircleSkillConfig
  
  // Bridge Kit 实例
  private bridgeKit: BridgeKit | null = null
  
  // 跨链状态跟踪
  private transfers: Map<string, CCTPTransferResult> = new Map()
  
  /**
   * 构造函数
   */
  constructor(config: CircleSkillConfig = {}) {
    super(config)
    
    this.circleConfig = {
      messageTransmitterAddress: config.messageTransmitterAddress || '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275', // 默认测试网地址
      tokenMessengerAddress: config.tokenMessengerAddress || '0xb43db544E2c27092c107639Ad201b3dEfAbcF192', // 默认测试网地址
      supportedChains: config.supportedChains || [ChainId.ARBITRUM_SEPOLIA, ChainId.BASE_SEPOLIA],
      defaultGasLimit: config.defaultGasLimit || '500000',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 2000,
      debugMode: config.debugMode || false,
      privateKey: config.privateKey,
    }
  }
  
  // ==================== 抽象方法实现 ====================
  
  /**
   * 初始化 Circle CCTP 技能
   */
  protected async onInitialize(): Promise<void> {
    console.log('Initializing Circle CCTP skill with Bridge Kit...')
    
    try {
      // 初始化 Bridge Kit
      await this.initializeBridgeKit()
      
      // 验证配置的合约地址
      this.validateContractAddresses()
      
      // 清空状态跟踪
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
   * 初始化 Bridge Kit
   */
  private async initializeBridgeKit(): Promise<void> {
    try {
      // 创建 Bridge Kit 实例
      this.bridgeKit = new BridgeKit()
      
      // 如果有私钥配置，创建适配器（仅用于测试）
      if (this.circleConfig.privateKey) {
        console.log('🔑 Using private key from config for Bridge Kit adapter')
        // 注意：实际生产环境应从钱包提供者获取适配器
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
   * 执行 Circle CCTP 操作
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
   * 自定义参数验证
   */
  protected onValidate(params: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const { action = 'transfer' } = params
    
    // 通用验证
    if (action === 'transfer') {
      // 验证链 ID
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
      
      // 验证金额
      if (!params.amount) {
        errors.push('Missing required parameter: amount')
      } else if (!this.isValidAmount(params.amount)) {
        errors.push(`Invalid amount format: ${params.amount}. Must be a positive number`)
      }
      
      // 验证接收地址（如果提供）
      if (params.recipient && !this.isValidAddress(params.recipient)) {
        errors.push(`Invalid recipient address: ${params.recipient}`)
      }
    }
    
    // 状态检查验证
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
   * 估算执行成本
   */
  protected async onEstimate(params: Record<string, any>, context: AgentContext): Promise<{
    gasEstimate: string
    timeEstimate: number
    costEstimate?: string
  }> {
    const { fromChainId, toChainId, amount } = params
    
    // 使用 Bridge Kit 进行估算
    try {
      const estimate = await this.estimateTransfer(params, context)
      return {
        gasEstimate: estimate.estimatedGas || '1000000',
        timeEstimate: estimate.estimatedTime || 60000,
        costEstimate: estimate.totalFee || 'Varies by network conditions',
      }
    } catch (error) {
      // 回退到保守估算
      console.warn('Failed to get estimate from Bridge Kit, using conservative values:', error)
      return {
        gasEstimate: '1000000',
        timeEstimate: 60000,
        costEstimate: 'Testnet - minimal cost',
      }
    }
  }
  
  // ==================== 具体操作方法 ====================
  
  /**
   * 执行 CCTP 跨链转移
   */
  private async executeCCTPTransfer(params: Record<string, any>, context: AgentContext): Promise<CCTPTransferResult> {
    const {
      fromChainId,
      toChainId,
      amount,
      recipient = context.userAddress,
      deadline = Date.now() + 30 * 60 * 1000, // 默认30分钟截止
    } = params
    
    // 生成转移 ID
    const transferId = this.generateTransferId(fromChainId, toChainId, amount, recipient)
    
    // 初始化转移状态
    const transfer: CCTPTransferResult = {
      status: CCTPTransferStatus.PENDING,
      fromChainId: Number(fromChainId),
      toChainId: Number(toChainId),
      amount: String(amount),
      recipient: recipient as Address,
      initiatedAt: Date.now(),
    }
    
    // 保存状态
    this.transfers.set(transferId, transfer)
    
    console.log(`🚀 Initiating CCTP transfer with Bridge Kit:`, {
      transferId,
      fromChainId,
      toChainId,
      amount,
      recipient,
    })
    
    try {
      // 验证 Bridge Kit
      if (!this.bridgeKit) {
        throw new Error('Bridge Kit not initialized')
      }
      
      // 获取适配器（这里简化，实际应从上下文获取钱包适配器）
      const adapter = await this.getAdapter(context, Number(fromChainId))
      if (!adapter) {
        throw new Error('Unable to get wallet adapter for source chain')
      }
      
      // 映射链标识符
      const fromChain = mapChainIdToBridgeChain(Number(fromChainId))
      const toChain = mapChainIdToBridgeChain(Number(toChainId))
      
      // 构建 Bridge Kit 参数
      const bridgeParams = {
        from: { adapter, chain: fromChain },
        to: { adapter, chain: toChain, recipientAddress: recipient },
        amount: amount,
        token: 'USDC' as const,
      }
      
      console.log('📋 Bridge Kit parameters:', bridgeParams)
      
      // 执行跨链转移
      const result = await this.bridgeKit.bridge(bridgeParams)
      
      console.log('📋 Bridge Kit result:', result)
      
      // 提取交易哈希（根据 Bridge Kit 结果结构）
      let sourceTxHash: string | undefined
      let messageHash: string | undefined
      let destinationTxHash: string | undefined
      
      if (result.state === 'success') {
        // 从步骤中提取交易哈希
        for (const step of result.steps) {
          // 根据步骤名称判断类型
          if (step.name.toLowerCase().includes('burn') && step.state === 'success' && step.txHash) {
            sourceTxHash = step.txHash
          }
          if (step.name.toLowerCase().includes('message') && step.state === 'success') {
            // 消息步骤可能没有交易哈希，但可能有其他标识符
            messageHash = step.data as string || step.txHash
          }
          if (step.name.toLowerCase().includes('mint') && step.state === 'success' && step.txHash) {
            destinationTxHash = step.txHash
          }
        }
      }
      
      // 更新转移状态
      const updatedTransfer: CCTPTransferResult = {
        ...transfer,
        status: result.state === 'success' ? CCTPTransferStatus.INITIATED : CCTPTransferStatus.PENDING,
        sourceTxHash,
        messageHash,
        destinationTxHash,
        note: result.state === 'success' ? 'CCTP 跨链已启动，等待跨链消息确认' : '跨链进行中',
        implementationRequired: false,
      }
      
      // 更新状态
      this.transfers.set(transferId, updatedTransfer)
      
      console.log(`✅ CCTP transfer initiated successfully:`, {
        transferId,
        sourceTxHash: updatedTransfer.sourceTxHash,
        messageHash: updatedTransfer.messageHash,
      })
      
      // 记录执行日志
      this.logExecution('cctp_transfer', params, context, updatedTransfer)
      
      return updatedTransfer
      
    } catch (error) {
      console.error('❌ CCTP transfer failed:', error)
      
      // 更新为失败状态
      const result: CCTPTransferResult = {
        ...transfer,
        status: CCTPTransferStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        note: 'CCTP 跨链执行失败',
        implementationRequired: false,
      }
      
      // 更新状态
      this.transfers.set(transferId, result)
      
      // 记录执行日志
      this.logExecution('cctp_transfer', params, context, result)
      
      return result
    }
  }
  
  /**
   * 检查转移状态
   */
  private async checkTransferStatus(params: Record<string, any>, context: AgentContext): Promise<CCTPTransferResult> {
    const { transferId } = params
    
    // 查找转移记录
    const transfer = this.transfers.get(transferId)
    if (!transfer) {
      throw new Error(`Transfer not found: ${transferId}`)
    }
    
    try {
      // 如果有消息哈希，使用 Bridge Kit 检查链上状态
      if (transfer.messageHash && this.bridgeKit) {
        console.log(`🔍 Checking CCTP transfer status for message hash: ${transfer.messageHash}`)
        
        // 注意：Bridge Kit 目前没有直接的 checkTransferStatus 方法
        // 我们可以通过查询链上状态来实现，这里简化处理
        // 实际实现应调用 Bridge Kit 的相应方法或直接查询链上数据
        
        // 暂时返回当前状态，标记为需要实现
        const updatedTransfer: CCTPTransferResult = {
          ...transfer,
          note: '状态检查功能需要进一步实现 Bridge Kit 集成',
          implementationRequired: true,
        }
        
        // 保存更新后的状态
        this.transfers.set(transferId, updatedTransfer)
        
        console.log(`ℹ️  CCTP transfer status check not fully implemented`)
        
        // 记录执行日志
        this.logExecution('cctp_status_check', params, context, updatedTransfer)
        
        return updatedTransfer
      }
      
      // 如果没有消息哈希或 SDK 不可用，返回当前状态
      console.log(`ℹ️  No message hash or Bridge Kit unavailable for transfer: ${transferId}`)
      
      const result: CCTPTransferResult = {
        ...transfer,
        note: transfer.messageHash ? '等待跨链消息确认' : '转移尚未启动',
        implementationRequired: !transfer.messageHash,
      }
      
      // 记录执行日志
      this.logExecution('cctp_status_check', params, context, result)
      
      return result
      
    } catch (error) {
      console.error(`❌ Failed to check CCTP transfer status:`, error)
      
      const result: CCTPTransferResult = {
        ...transfer,
        error: error instanceof Error ? error.message : String(error),
        note: '状态检查失败',
        implementationRequired: false,
      }
      
      // 记录执行日志
      this.logExecution('cctp_status_check', params, context, result)
      
      return result
    }
  }
  
  /**
   * 估算转移成本
   */
  private async estimateTransfer(params: Record<string, any>, context: AgentContext): Promise<any> {
    const { fromChainId, toChainId, amount } = params
    
    try {
      // 验证 Bridge Kit
      if (!this.bridgeKit) {
        throw new Error('Bridge Kit not initialized')
      }
      
      // 获取适配器（简化）
      const adapter = await this.getAdapter(context, Number(fromChainId))
      if (!adapter) {
        throw new Error('Unable to get wallet adapter for estimation')
      }
      
      // 映射链标识符
      const fromChain = mapChainIdToBridgeChain(Number(fromChainId))
      const toChain = mapChainIdToBridgeChain(Number(toChainId))
      
      // 使用 Bridge Kit 进行估算
      const estimate = await this.bridgeKit.estimate({
        from: { adapter, chain: fromChain },
        to: { adapter, chain: toChain },
        amount: amount,
        token: 'USDC' as const,
      })
      
      console.log('📊 Bridge Kit estimate:', estimate)
      
      // 从 gasFees 中提取 gas 估算
      let totalGasEstimate = '1500000' // 默认值
      if (estimate.gasFees && estimate.gasFees.length > 0) {
        // 计算总 gas 估算（简化处理）
        const totalGas = estimate.gasFees.reduce((sum, fee) => {
          if (fee.fees && fee.fees.fee) {
            return sum + parseFloat(fee.fees.fee)
          }
          return sum
        }, 0)
        totalGasEstimate = totalGas > 0 ? totalGas.toString() : '1500000'
      }
      
      // 从 fees 中提取协议费用
      let sourceFee = '0.01'
      let destinationFee = '0.02'
      let totalProtocolFee = '0.03'
      
      if (estimate.fees && estimate.fees.length > 0) {
        // 计算总协议费用
        const protocolFees = estimate.fees.filter(fee => fee.type === 'provider' && fee.amount)
        const totalFee = protocolFees.reduce((sum, fee) => {
          return sum + parseFloat(fee.amount || '0')
        }, 0)
        totalProtocolFee = totalFee > 0 ? totalFee.toFixed(4) : '0.03'
        
        // 简化：假设第一个费用是源链，第二个是目标链
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
        estimatedTime: 60000, // 默认1分钟，实际应从 estimate 中获取
        estimatedCost: totalProtocolFee,
        sourceChainFee: sourceFee,
        destinationChainFee: destinationFee,
        totalFee: (parseFloat(sourceFee) + parseFloat(destinationFee)).toFixed(4),
        note: '基于 Bridge Kit 的估算',
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
      
      // 记录执行日志
      this.logExecution('cctp_estimate', params, context, result)
      
      return result
      
    } catch (error) {
      console.error('❌ Failed to estimate CCTP transfer:', error)
      
      // 返回保守估算
      const result = {
        fromChainId,
        toChainId,
        amount,
        estimatedGas: '1500000', // 保守估计
        estimatedTime: 90000,    // 1.5分钟
        estimatedCost: '0.03',   // 保守成本
        note: '估算失败，使用保守值。错误: ' + (error instanceof Error ? error.message : String(error)),
        implementationRequired: true,
      }
      
      // 记录执行日志
      this.logExecution('cctp_estimate', params, context, result)
      
      return result
    }
  }
  
  // ==================== 工具方法 ====================
  
  /**
   * 获取适配器（简化实现）
   * 实际应从 AgentContext 中获取钱包提供者
   */
  private async getAdapter(context: AgentContext, chainId: number): Promise<any> {
    // 如果有配置的私钥，使用它创建适配器（仅用于测试）
    if (this.circleConfig.privateKey) {
      try {
        // 验证链是否支持
        const supportedChainIds = [arbitrumSepolia.id, baseSepolia.id, sepolia.id] as number[]
        if (!supportedChainIds.includes(chainId)) {
          throw new Error(`Unsupported chain ID for adapter: ${chainId}`)
        }

        // 创建适配器 - 使用正确的API
        const adapter = createViemAdapterFromPrivateKey({
          privateKey: this.circleConfig.privateKey,
          getPublicClient: ({ chain }) => {
            let rpcUrl: string
            
            // 根据链ID选择RPC URL
            if (chain.id === arbitrumSepolia.id) {
              rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || arbitrumSepolia.rpcUrls.default.http[0]
            } else if (chain.id === baseSepolia.id) {
              rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || baseSepolia.rpcUrls.default.http[0]
            } else if (chain.id === sepolia.id) {
              rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC || sepolia.rpcUrls.default.http[0]
            } else {
              // 默认使用链的默认RPC
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
        // 继续尝试其他方法
      }
    }
    
    // 尝试从上下文中获取钱包适配器
    // 这里需要根据实际项目结构实现
    console.warn('No private key provided and wallet adapter not implemented, using fallback')
    
    // 返回 null 表示需要外部适配器
    return null
  }
  
  /**
   * 验证合约地址
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
   * 生成转移 ID
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
   * 获取 USDC 地址
   */
  private getUSDCAddress(chainId: number): Address {
    try {
      // 尝试从 addresses.ts 获取
      return getUSDCAddress(chainId)
    } catch (error) {
      // 返回默认测试网地址
      if (chainId === ChainId.ARBITRUM_SEPOLIA) {
        return '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address
      } else if (chainId === ChainId.BASE_SEPOLIA) {
        return '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address
      }
      throw new Error(`USDC address not found for chain ${chainId}`)
    }
  }
  
  /**
   * 将 SDK 状态映射到 CCTP 状态
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
   * 重置技能
   */
  protected onReset(): void {
    this.transfers.clear()
  }
}

// ==================== 导出和注册 ====================

/**
 * 创建并注册 Circle CCTP 技能实例
 */
export function initializeCircleSkill(config: CircleSkillConfig = {}): CircleSkill {
  return createAndRegisterSkill(CircleSkill, config)
}

/**
 * 获取 Circle CCTP 技能实例
 */
export async function getCircleSkill(): Promise<CircleSkill | undefined> {
  try {
    // 使用 ES 模块动态导入避免循环依赖
    const { getSkillRegistry } = await import('./base-skill')
    const registry = getSkillRegistry()
    return registry.get('circle') as CircleSkill | undefined
  } catch (error) {
    console.error('Failed to get Circle skill:', error)
    return undefined
  }
}