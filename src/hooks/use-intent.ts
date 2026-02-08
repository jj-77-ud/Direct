'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getIntentParser, type IntentParserResult } from '@/lib/ai/intent-parser';
import { NomadIntent, IntentType, isSwapIntent, isBridgeIntent, isCctpIntent, isResolveEnsIntent } from '@/types/intent';
import { useAccount } from 'wagmi';

interface UseIntentOptions {
  onSuccess?: (result: IntentParserResult) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * AI意图解析的React Hook
 * 将自然语言转换为结构化区块链操作意图
 */
export function useIntent(options: UseIntentOptions = {}) {
  const { onSuccess, onError, enabled = true } = options;
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  const [currentIntent, setCurrentIntent] = useState<NomadIntent | null>(null);
  const [parsingHistory, setParsingHistory] = useState<Array<{
    input: string;
    result: IntentParserResult;
    timestamp: Date;
  }>>([]);

  // 意图解析Mutation
  const parseMutation = useMutation({
    mutationFn: async (input: string) => {
      if (!input.trim()) {
        throw new Error('输入不能为空');
      }

      // 添加用户上下文信息
      const context = {
        userAddress: address,
        isConnected,
        timestamp: new Date().toISOString(),
      };

      // 获取意图解析器实例并调用
      const parser = getIntentParser();
      const result = await parser.parse(input);
      
      if (result.intent) {
        setCurrentIntent(result.intent);
        
        // 添加到历史记录
        setParsingHistory(prev => [
          {
            input,
            result,
            timestamp: new Date(),
          },
          ...prev.slice(0, 9), // 保留最近10条记录
        ]);
      }
      
      return result;
    },
    onSuccess: (result) => {
      if (onSuccess) {
        onSuccess(result);
      }
      
      // 如果解析成功且有意图，可以触发后续操作
      if (result.intent) {
        queryClient.invalidateQueries({ queryKey: ['intent', result.intent.type] });
      }
    },
    onError: (error: Error) => {
      console.error('意图解析失败:', error);
      if (onError) {
        onError(error);
      }
    },
  });

  // 解析意图
  const parse = useCallback((input: string) => {
    if (!enabled) {
      console.warn('意图解析已禁用');
      return;
    }
    
    return parseMutation.mutateAsync(input);
  }, [enabled, parseMutation]);

  // 重置当前意图
  const reset = useCallback(() => {
    setCurrentIntent(null);
  }, []);

  // 获取历史记录
  const getHistory = useCallback(() => {
    return parsingHistory;
  }, [parsingHistory]);

  // 根据意图类型获取操作建议
  const getActionSuggestions = useCallback((intent: NomadIntent) => {
    const suggestions: string[] = [];
    
    switch (intent.type) {
      case IntentType.SWAP:
        suggestions.push(
          '确认交易对和数量',
          '检查滑点设置',
          '确认网络手续费',
          '预览交易详情'
        );
        break;
        
      case IntentType.BRIDGE:
        suggestions.push(
          '确认跨链网络',
          '检查跨链手续费',
          '确认目标地址',
          '预估到账时间'
        );
        break;
        
      case IntentType.CCTP_TRANSFER:
        suggestions.push(
          '确认USDC数量',
          '检查Circle CCTP手续费',
          '确认源链和目标链',
          '预估跨链时间'
        );
        break;
        
      case IntentType.RESOLVE_ENS:
        suggestions.push(
          '确认ENS域名',
          '检查解析结果',
          '验证所有权'
        );
        break;
        
      default:
        suggestions.push(
          '确认操作详情',
          '检查参数完整性',
          '预览执行计划'
        );
    }
    
    return suggestions;
  }, []);

  // 验证意图是否可执行
  const validateIntent = useCallback((intent: NomadIntent): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础验证
    if (!intent.type) {
      errors.push('意图类型未定义');
    }

    if (!address && intent.type !== IntentType.RESOLVE_ENS) {
      errors.push('请先连接钱包');
    }

    // 使用类型守卫进行类型特定验证
    if (isSwapIntent(intent)) {
      if (!intent.params.fromToken) {
        errors.push('未指定源代币');
      }
      if (!intent.params.toToken) {
        errors.push('未指定目标代币');
      }
      if (!intent.params.amountIn) {
        errors.push('未指定交换数量');
      }
    } else if (isBridgeIntent(intent)) {
      if (!intent.params.fromChainId) {
        errors.push('未指定源链');
      }
      if (!intent.params.toChainId) {
        errors.push('未指定目标链');
      }
      if (!intent.params.amount) {
        errors.push('未指定跨链数量');
      }
    } else if (isCctpIntent(intent)) {
      if (!intent.params.amount) {
        errors.push('未指定转移数量');
      }
      if (intent.params.amount && Number(intent.params.amount) < 1) {
        warnings.push('CCTP转移数量建议大于1 USDC');
      }
    } else if (isResolveEnsIntent(intent)) {
      if (!intent.params.domain) {
        errors.push('未指定ENS域名');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [address]);

  return {
    // 状态
    currentIntent,
    isParsing: parseMutation.isPending,
    isError: parseMutation.isError,
    error: parseMutation.error,
    history: parsingHistory,
    
    // 操作
    parse,
    reset,
    getHistory,
    getActionSuggestions,
    validateIntent,
    
    // 工具函数
    hasIntent: !!currentIntent,
    intentType: currentIntent?.type,
    
    // 查询状态
    isLoading: parseMutation.isPending,
    isSuccess: parseMutation.isSuccess,
    data: parseMutation.data,
  };
}

/**
 * 意图执行状态跟踪Hook
 */
export function useIntentExecution() {
  const [executionState, setExecutionState] = useState<'idle' | 'preparing' | 'executing' | 'completed' | 'failed'>('idle');
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const startExecution = useCallback(() => {
    setExecutionState('preparing');
    setExecutionProgress(0);
    setExecutionError(null);
    setTransactionHash(null);
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setExecutionProgress(Math.min(100, Math.max(0, progress)));
    
    if (progress >= 100) {
      setExecutionState('completed');
    } else if (progress > 0) {
      setExecutionState('executing');
    }
  }, []);

  const setError = useCallback((error: string) => {
    setExecutionError(error);
    setExecutionState('failed');
  }, []);

  const setTxHash = useCallback((hash: string) => {
    setTransactionHash(hash);
  }, []);

  const resetExecution = useCallback(() => {
    setExecutionState('idle');
    setExecutionProgress(0);
    setExecutionError(null);
    setTransactionHash(null);
  }, []);

  return {
    executionState,
    executionProgress,
    executionError,
    transactionHash,
    startExecution,
    updateProgress,
    setError,
    setTxHash,
    resetExecution,
    isExecuting: executionState === 'executing',
    isPreparing: executionState === 'preparing',
    isCompleted: executionState === 'completed',
    isFailed: executionState === 'failed',
    isIdle: executionState === 'idle',
  };
}