'use client';

import React, { ReactNode } from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Loader2, ExternalLink, ChevronRight, Network, GitMerge, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType = 'pending' | 'processing' | 'success' | 'error' | 'warning' | 'skipped';
export type StepType = 'intent' | 'swap' | 'bridge' | 'cctp' | 'ens' | 'approval' | 'confirmation';

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: StatusType;
  type: StepType;
  timestamp?: string;
  txHash?: string;
  chainId?: number;
  details?: Record<string, any>;
}

export interface StatusCardProps {
  title?: string;
  description?: string;
  steps: Step[];
  currentStep?: number;
  showTimeline?: boolean;
  compact?: boolean;
  className?: string;
  onStepClick?: (step: Step, index: number) => void;
}

const StatusCard = ({
  title = 'Cross-Chain Execution Status',
  description = 'Tracking your multi-step intent execution across chains',
  steps,
  currentStep = 0,
  showTimeline = true,
  compact = false,
  className,
  onStepClick,
}: StatusCardProps) => {
  // 状态图标
  const getStatusIcon = (status: StatusType, type: StepType) => {
    const iconClass = 'w-4 h-4';
    
    switch (status) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'processing':
        return <Loader2 className={`${iconClass} text-ai-blue animate-spin`} />;
      case 'error':
        return <XCircle className={`${iconClass} text-red-500`} />;
      case 'warning':
        return <AlertCircle className={`${iconClass} text-yellow-500`} />;
      case 'skipped':
        return <ChevronRight className={`${iconClass} text-gray-500`} />;
      case 'pending':
      default:
        // 根据步骤类型显示不同的图标
        switch (type) {
          case 'swap':
            return <GitMerge className={`${iconClass} text-ai-purple`} />;
          case 'bridge':
            return <Network className={`${iconClass} text-ai-blue`} />;
          case 'cctp':
            return <Layers className={`${iconClass} text-ai-cyan`} />;
          case 'ens':
            return <ExternalLink className={`${iconClass} text-ai-magenta`} />;
          default:
            return <Clock className={`${iconClass} text-gray-400`} />;
        }
    }
  };

  // 状态颜色
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'processing': return 'bg-ai-blue/10 border-ai-blue/30 animate-pulse';
      case 'error': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'skipped': return 'bg-gray-500/10 border-gray-500/30';
      case 'pending': 
      default: return 'bg-tech-gray border-tech-light';
    }
  };

  // 状态文本
  const getStatusText = (status: StatusType) => {
    switch (status) {
      case 'success': return 'Completed';
      case 'processing': return 'Processing';
      case 'error': return 'Failed';
      case 'warning': return 'Warning';
      case 'skipped': return 'Skipped';
      case 'pending': 
      default: return 'Pending';
    }
  };

  // 步骤类型颜色
  const getStepTypeColor = (type: StepType) => {
    switch (type) {
      case 'swap': return 'text-ai-purple';
      case 'bridge': return 'text-ai-blue';
      case 'cctp': return 'text-ai-cyan';
      case 'ens': return 'text-ai-magenta';
      case 'approval': return 'text-yellow-500';
      case 'confirmation': return 'text-green-500';
      default: return 'text-gray-300';
    }
  };

  // 链图标
  const getChainIcon = (chainId?: number) => {
    if (!chainId) return null;
    
    const chainColors: Record<number, string> = {
      421614: 'bg-arbitrum/20 text-arbitrum', // Arbitrum Sepolia
      84532: 'bg-base/20 text-base', // Base Sepolia
      11155111: 'bg-ethereum/20 text-ethereum', // Sepolia
    };

    const colorClass = chainColors[chainId] || 'bg-tech-gray text-gray-300';
    
    return (
      <div className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {chainId === 421614 ? 'Arbitrum' : 
         chainId === 84532 ? 'Base' : 
         chainId === 11155111 ? 'Sepolia' : 
         `Chain ${chainId}`}
      </div>
    );
  };

  return (
    <div className={cn('ai-card p-6', className)}>
      {/* 标题区域 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-ai-blue animate-pulse" />
              <span className="text-xs text-ai-blue">Live</span>
            </div>
            <div className="text-xs px-3 py-1 rounded-full bg-tech-gray text-gray-300">
              {steps.filter(s => s.status === 'success').length}/{steps.length} steps
            </div>
          </div>
        </div>
      </div>

      {/* 时间线 */}
      {showTimeline && (
        <div className="relative mb-6">
          {/* 时间线连接线 */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-tech-gray -z-10" />
          
          {/* 步骤 */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = step.status === 'success';
              const isProcessing = step.status === 'processing';
              
              return (
                <div 
                  key={step.id}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-xl transition-all duration-300 cursor-pointer',
                    getStatusColor(step.status),
                    isActive && 'ring-2 ring-ai-blue/50',
                    onStepClick && 'hover:bg-tech-gray/50'
                  )}
                  onClick={() => onStepClick?.(step, index)}
                >
                  {/* 步骤序号和状态图标 */}
                  <div className="relative">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      isCompleted && 'bg-green-500/20',
                      isProcessing && 'bg-ai-blue/20',
                      isActive && 'bg-ai-blue/30',
                      !isCompleted && !isProcessing && !isActive && 'bg-tech-gray'
                    )}>
                      {getStatusIcon(step.status, step.type)}
                    </div>
                    
                    {/* 步骤序号 */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-tech-dark border border-tech-gray flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                  </div>

                  {/* 步骤内容 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{step.title}</h4>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', getStepTypeColor(step.type))}>
                          {step.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {step.chainId && getChainIcon(step.chainId)}
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded',
                          step.status === 'success' && 'bg-green-500/20 text-green-400',
                          step.status === 'processing' && 'bg-ai-blue/20 text-ai-blue',
                          step.status === 'error' && 'bg-red-500/20 text-red-400',
                          step.status === 'pending' && 'bg-gray-500/20 text-gray-400',
                        )}>
                          {getStatusText(step.status)}
                        </span>
                      </div>
                    </div>

                    {step.description && (
                      <p className="text-sm text-gray-400 mb-2">{step.description}</p>
                    )}

                    {/* 元数据 */}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      {step.timestamp && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{step.timestamp}</span>
                        </div>
                      )}
                      
                      {step.txHash && (
                        <div className="flex items-center gap-1 text-xs text-ai-blue">
                          <ExternalLink className="w-3 h-3" />
                          <a 
                            href={`https://sepolia.arbiscan.io/tx/${step.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            View transaction
                          </a>
                        </div>
                      )}

                      {step.details && Object.keys(step.details).length > 0 && (
                        <div className="text-xs text-gray-500">
                          {Object.entries(step.details).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              <span className="text-gray-400">{key}:</span> {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右侧箭头 */}
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 紧凑模式 */}
      {compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={cn(
                'p-3 rounded-lg border',
                getStatusColor(step.status),
                onStepClick && 'cursor-pointer hover:bg-tech-gray/30'
              )}
              onClick={() => onStepClick?.(step, index)}
            >
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(step.status, step.type)}
                <span className="text-sm font-medium text-white">{step.title}</span>
              </div>
              <div className="text-xs text-gray-400">{getStatusText(step.status)}</div>
            </div>
          ))}
        </div>
      )}

      {/* 进度条 */}
      {!compact && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Overall Progress</span>
            <span className="text-sm font-medium text-white">
              {Math.round((steps.filter(s => s.status === 'success').length / steps.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-tech-gray rounded-full overflow-hidden">
            <div 
              className="h-full ai-gradient rounded-full transition-all duration-500"
              style={{ 
                width: `${(steps.filter(s => s.status === 'success').length / steps.length) * 100}%` 
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">Started</span>
            <span className="text-xs text-gray-500">In Progress</span>
            <span className="text-xs text-gray-500">Completed</span>
          </div>
        </div>
      )}

      {/* 状态摘要 */}
      <div className="mt-6 pt-6 border-t border-tech-gray flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-300">Completed</span>
            <span className="text-sm font-medium text-white">
              {steps.filter(s => s.status === 'success').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-ai-blue animate-pulse" />
            <span className="text-sm text-gray-300">Processing</span>
            <span className="text-sm font-medium text-white">
              {steps.filter(s => s.status === 'processing').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-sm text-gray-300">Pending</span>
            <span className="text-sm font-medium text-white">
              {steps.filter(s => s.status === 'pending').length}
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default StatusCard;