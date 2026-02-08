'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { NomadIntent, IntentType } from '@/types/intent';
import { getSkillManager } from '@/skills/skill-manager';
import { BaseSkill } from '@/skills/base-skill';
import { SkillExecutionResult } from '@/types/agent';

interface UseSkillExecutionOptions {
  onSuccess?: (result: SkillExecutionResult) => void;
  onError?: (error: Error) => void;
  autoInitialize?: boolean;
}

/**
 * 技能执行的React Hook
 * 负责将解析后的意图转换为具体的技能执行
 */
export function useSkillExecution(options: UseSkillExecutionOptions = {}) {
  const { onSuccess, onError, autoInitialize = true } = options;
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [skillManager, setSkillManager] = useState<ReturnType<typeof getSkillManager> | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Map<string, BaseSkill>>(new Map());

  // 初始化技能管理器 - 当 walletClient 变化时重新初始化
  useEffect(() => {
    if (autoInitialize && !isInitializing && walletClient) {
      // 如果 walletClient 可用，则初始化或重新初始化技能管理器
      console.log('检测到 walletClient 可用，初始化技能管理器:', {
        hasWalletClient: !!walletClient,
        hasSkillManager: !!skillManager,
      });
      initializeSkillManager();
    }
  }, [autoInitialize, isInitializing, walletClient]); // 注意：这里不包含 initializeSkillManager 以避免循环依赖

  const initializeSkillManager = useCallback(async () => {
    setIsInitializing(true);
    setInitializationError(null);
    
    try {
      // 准备技能配置，包含钱包客户端和公共客户端
      const skillConfigs = {
        lifi: {
          walletClient: walletClient || undefined,
          publicClient: publicClient || undefined,
        },
        uniswap: {
          walletClient: walletClient || undefined,
          publicClient: publicClient || undefined,
        },
        circle: {
          walletClient: walletClient || undefined,
          publicClient: publicClient || undefined,
        },
        ens: {
          publicClient: publicClient || undefined,
        },
      };
      
      const manager = getSkillManager({
        autoInitialize: true,
        verbose: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
        skillConfigs,
      });
      
      await manager.initializeAllSkills();
      setSkillManager(manager);
      
      // 获取可用的技能
      const skills = manager.getAllSkills();
      setAvailableSkills(new Map(Object.entries(skills)));
      
      console.log('技能管理器初始化完成，可用技能:', Array.from(skills.keys()));
      console.log('技能配置已传递:', {
        hasWalletClient: !!walletClient,
        hasPublicClient: !!publicClient,
        walletClientType: walletClient ? typeof walletClient : 'null',
        publicClientType: publicClient ? typeof publicClient : 'null',
      });
    } catch (error: any) {
      console.error('技能管理器初始化失败:', error);
      setInitializationError(error.message || '初始化失败');
      if (onError) {
        onError(error);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [onError, walletClient, publicClient]);

  // 根据意图类型获取对应的技能
  const getSkillForIntent = useCallback((intent: NomadIntent): BaseSkill | null => {
    if (!skillManager) {
      console.warn('技能管理器未初始化');
      return null;
    }

    // 根据技能ID获取技能
    let skillId: string;
    switch (intent.type) {
      case IntentType.SWAP:
        skillId = 'uniswap';
        break;
      case IntentType.BRIDGE:
        skillId = 'lifi'; // 使用LI.FI进行跨链
        break;
      case IntentType.CCTP_TRANSFER:
        skillId = 'circle'; // 使用Circle CCTP
        break;
      case IntentType.RESOLVE_ENS:
        skillId = 'ens';
        break;
      default:
        console.warn('未知的意图类型:', intent.type);
        return null;
    }
    
    const skill = skillManager.getSkill(skillId);
    return skill || null;
  }, [skillManager]);

  // 转换意图参数为技能期望的格式
  const transformIntentParams = useCallback((intent: NomadIntent): Record<string, any> => {
    const baseParams = intent.params || {};
    
    switch (intent.type) {
      case IntentType.BRIDGE:
        // 类型断言为BridgeParams
        const bridgeParams = baseParams as any;
        const tokenSymbol = bridgeParams.token?.symbol || bridgeParams.token || 'USDC'; // 默认USDC
        const fromChainId = bridgeParams.fromChainId || intent.chainId;
        const toChainId = bridgeParams.toChainId;
        const amount = bridgeParams.amount?.formatted || bridgeParams.amount || '1.0';
        
        // 转换BRIDGE意图参数为LI.FI技能期望的格式
        const transformed = {
          ...bridgeParams,
          action: 'execute', // LI.FI技能需要action参数
          // 确保参数名称匹配LI.FI技能期望的格式
          fromChainId,
          toChainId,
          amount,
          // 尝试从token符号获取地址
          fromTokenAddress: bridgeParams.token?.address || getTokenAddressBySymbol(tokenSymbol, fromChainId),
          toTokenAddress: bridgeParams.token?.address || getTokenAddressBySymbol(tokenSymbol, toChainId),
        };
        
        console.log('转换BRIDGE意图参数:', {
          original: bridgeParams,
          transformed,
        });
        
        return transformed;
        
      case IntentType.SWAP:
        // 转换SWAP意图参数为Uniswap技能期望的格式
        return {
          ...baseParams,
          action: 'swap',
        };
        
      default:
        // 其他意图类型保持原样
        return baseParams;
    }
  }, []);

  // 获取token地址的辅助函数（简化版，实际应该从配置或API获取）
  const getTokenAddressBySymbol = useCallback((symbol: string, chainId: number): string => {
    // 简化的token地址映射
    const tokenAddresses: Record<string, Record<number, string>> = {
      USDC: {
        1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
        42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum One
        421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA1d', // Arbitrum Sepolia (修正: AA1d 不是 AA4d)
        8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet
        84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
      },
      ETH: {
        1: '0x0000000000000000000000000000000000000000', // Native ETH
        42161: '0x0000000000000000000000000000000000000000',
        421614: '0x0000000000000000000000000000000000000000',
        8453: '0x0000000000000000000000000000000000000000',
        84532: '0x0000000000000000000000000000000000000000',
      },
      WETH: {
        1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        421614: '0x980B62Da83eFf3D4576C647993b0C1D7faf17C73',
        8453: '0x4200000000000000000000000000000000000006',
        84532: '0x4200000000000000000000000000000000000006',
      },
    };
    
    const upperSymbol = symbol?.toUpperCase();
    if (tokenAddresses[upperSymbol] && tokenAddresses[upperSymbol][chainId]) {
      return tokenAddresses[upperSymbol][chainId];
    }
    
    // 如果找不到，返回空字符串，让技能自己处理
    console.warn(`找不到token地址: symbol=${symbol}, chainId=${chainId}`);
    return '';
  }, []);

  // 执行意图
  const executeIntent = useCallback(async (intent: NomadIntent): Promise<SkillExecutionResult> => {
    if (!skillManager) {
      throw new Error('技能管理器未初始化，请先调用initializeSkillManager()');
    }

    if (!address || !isConnected) {
      throw new Error('请先连接钱包');
    }

    if (!walletClient) {
      throw new Error('钱包客户端不可用');
    }

    // 获取对应的技能
    const skill = getSkillForIntent(intent);
    if (!skill) {
      throw new Error(`找不到处理 ${intent.type} 类型的技能`);
    }

    try {
      console.log(`执行 ${intent.type} 意图，使用技能:`, skill.metadata.id);
      
      // 转换意图参数为技能期望的格式
      const skillParams = transformIntentParams(intent);
      console.log('转换后的技能参数:', skillParams);
      
      // 准备执行上下文
      const context = {
        userAddress: address,
        chainId,
        balances: {}, // 这里应该从useAssets获取实际余额
        sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversationHistory: [], // 空的对话历史
      };

      let result: SkillExecutionResult;
      
      // 特殊处理BRIDGE意图：需要先获取报价，然后执行
      if (intent.type === IntentType.BRIDGE && skill.metadata.id === 'lifi') {
        console.log('🔄 处理BRIDGE意图：执行quote+execute流程');
        
        // 第一步：获取报价
        const quoteParams = {
          ...skillParams,
          action: 'quote',
        };
        
        console.log('获取报价参数:', quoteParams);
        const quoteResult = await skill.execute(quoteParams, context);
        
        if (!quoteResult.success) {
          throw new Error(`获取报价失败: ${quoteResult.error || '未知错误'}`);
        }
        
        console.log('✅ 报价获取成功:', {
          quoteId: quoteResult.output?.quoteId || quoteResult.output?.id,
          route: quoteResult.output?.route ? '存在' : '不存在',
        });
        
        // 第二步：执行交易
        const executeParams = {
          ...skillParams,
          action: 'execute',
          quoteId: quoteResult.output?.quoteId || quoteResult.output?.id,
          route: quoteResult.output?.route || quoteResult.output,
        };
        
        console.log('执行交易参数:', executeParams);
        result = await skill.execute(executeParams, context);
      } else {
        // 其他意图类型直接执行
        result = await skill.execute(skillParams, context);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      console.error('技能执行失败:', error);
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }, [skillManager, address, isConnected, walletClient, chainId, publicClient, getSkillForIntent, transformIntentParams, onSuccess, onError]);

  // 预估执行成本（Gas、手续费等）
  const estimateExecutionCost = useCallback(async (intent: NomadIntent) => {
    if (!skillManager) {
      throw new Error('技能管理器未初始化');
    }

    const skill = getSkillForIntent(intent);
    if (!skill) {
      throw new Error(`找不到处理 ${intent.type} 类型的技能`);
    }

    try {
      // 调用技能的预估方法（如果可用）
      if (typeof (skill as any).estimateCost === 'function') {
        return await (skill as any).estimateCost(intent);
      }
      
      // 默认返回基础预估
      return {
        gasEstimate: '0',
        feeEstimate: '0',
        timeEstimate: '30s', // 默认30秒
        warnings: [],
      };
    } catch (error) {
      console.warn('成本预估失败:', error);
      return {
        gasEstimate: 'unknown',
        feeEstimate: 'unknown',
        timeEstimate: 'unknown',
        warnings: ['无法预估执行成本'],
      };
    }
  }, [skillManager, getSkillForIntent]);

  // 验证意图是否可执行
  const validateIntentExecution = useCallback(async (intent: NomadIntent): Promise<{
    canExecute: boolean;
    reasons: string[];
    warnings: string[];
    estimatedCost?: any;
  }> => {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 基础验证
    if (!skillManager) {
      reasons.push('技能管理器未初始化');
    }

    if (!address || !isConnected) {
      reasons.push('请先连接钱包');
    }

    if (!walletClient) {
      reasons.push('钱包客户端不可用');
    }

    // 技能特定验证
    const skill = getSkillForIntent(intent);
    if (!skill) {
      reasons.push(`找不到处理 ${intent.type} 类型的技能`);
    }

    // 如果基础验证失败，直接返回
    if (reasons.length > 0) {
      return {
        canExecute: false,
        reasons,
        warnings,
      };
    }

    try {
      // 尝试预估成本
      const estimatedCost = await estimateExecutionCost(intent);
      
      // 检查技能特定的验证
      if (skill && typeof (skill as any).validateIntent === 'function') {
        const skillValidation = await (skill as any).validateIntent(intent);
        if (!skillValidation.valid) {
          reasons.push(...skillValidation.errors || []);
          warnings.push(...skillValidation.warnings || []);
        }
      }

      return {
        canExecute: reasons.length === 0,
        reasons,
        warnings,
        estimatedCost,
      };
    } catch (error: any) {
      reasons.push(`验证失败: ${error.message}`);
      return {
        canExecute: false,
        reasons,
        warnings,
      };
    }
  }, [skillManager, address, isConnected, walletClient, getSkillForIntent, estimateExecutionCost]);

  // 获取技能状态
  const getSkillStatus = useCallback(() => {
    if (!skillManager) {
      return {
        isInitialized: false,
        skills: [],
        error: initializationError,
      };
    }

    const skills = Array.from(availableSkills.entries()).map(([id, skill]) => ({
      id,
      name: skill.metadata.id,
      isAvailable: true, // 简化处理，实际应该检查skill.isAvailable()
      description: skill.metadata.description,
    }));

    return {
      isInitialized: true,
      skills,
      initializationStatus: skillManager.getInitializationStatus(),
    };
  }, [skillManager, availableSkills, initializationError]);

  return {
    // 状态
    skillManager,
    isInitializing,
    initializationError,
    availableSkills: Array.from(availableSkills.values()),
    
    // 操作
    initializeSkillManager,
    executeIntent,
    estimateExecutionCost,
    validateIntentExecution,
    getSkillForIntent,
    getSkillStatus,
    
    // 工具函数
    isReady: !!skillManager && !isInitializing,
    hasSkills: availableSkills.size > 0,
    
    // 技能信息
    skillCount: availableSkills.size,
    skillIds: Array.from(availableSkills.keys()),
  };
}

/**
 * 技能执行进度跟踪Hook
 */
export function useSkillExecutionProgress() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [steps, setSteps] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startExecution = useCallback((executionSteps: string[]) => {
    setProgress(0);
    setCurrentStep('');
    setSteps(executionSteps);
    setIsComplete(false);
    setError(null);
  }, []);

  const updateProgress = useCallback((stepIndex: number, stepName?: string) => {
    const newProgress = (stepIndex / steps.length) * 100;
    setProgress(newProgress);
    
    if (stepName) {
      setCurrentStep(stepName);
    } else if (stepIndex < steps.length) {
      setCurrentStep(steps[stepIndex]);
    }
    
    if (stepIndex >= steps.length) {
      setIsComplete(true);
      setCurrentStep('完成');
    }
  }, [steps]);

  const setExecutionError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsComplete(true);
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setCurrentStep('');
    setSteps([]);
    setIsComplete(false);
    setError(null);
  }, []);

  return {
    progress,
    currentStep,
    steps,
    isComplete,
    error,
    startExecution,
    updateProgress,
    setExecutionError,
    reset,
    isInProgress: progress > 0 && !isComplete,
    hasError: !!error,
  };
}