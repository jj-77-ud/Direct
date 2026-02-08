'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import AgentInput from '@/components/ui/agent-input';
import ActionButton, {
  ExecuteIntentButton,
  ViewOnExplorerButton,
  ApproveTokenButton,
  ConfirmTransactionButton
} from '@/components/ui/action-button';
import { WalletConnectButton } from '@/components/ui/wallet-connect-button';
import { Bot, Zap, ArrowRight, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { useAssets } from '@/hooks/use-assets';
import { useSkillExecution } from '@/hooks/use-skill-execution';
import { arbitrumSepolia, baseSepolia, sepolia } from 'viem/chains';

export default function HomePage() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 解析结果状态
  const [parseResult, setParseResult] = useState<{
    type: string;
    confidence: number;
    timestamp: Date;
    description?: string;
  } | null>(null);

  // 消息日志状态
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    content: string;
    timestamp: Date;
  }>>([]);

  // 使用真实的钱包连接状态
  const { address, isConnected, chainId } = useAccount();
  const currentChainId = useChainId();
  
  // 使用真实的资产数据
  const { assets: realAssets, isLoading: assetsLoading, totalBalanceUSD } = useAssets();

  // 使用技能执行钩子
  const { executeIntent, isReady, validateIntentExecution } = useSkillExecution({
    onSuccess: (result) => {
      console.log('技能执行成功:', result);
      const message = result.output?.message || result.output || 'Transaction completed';
      const displayMessage = `✅ Transaction executed successfully!\n${result.transactionHash ? `Transaction hash: ${result.transactionHash.substring(0, 20)}...` : message}`;
      
      // 添加到消息日志
      addMessage('success', displayMessage);
      
      // 添加执行成功的步骤
      const newStep = {
        id: (executionSteps.length + 1).toString(),
        title: 'Transaction Execution',
        description: `Executed: ${message}`,
        status: 'success' as const,
        type: 'transaction' as const,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      
      setExecutionSteps(prev => [newStep, ...prev.slice(0, 4)]);
    },
    onError: (error) => {
      console.error('技能执行失败:', error);
      const errorMessage = `❌ Transaction execution failed: ${error.message}`;
      
      // 添加到消息日志
      addMessage('error', errorMessage);
      
      // 添加执行失败的步骤
      const newStep = {
        id: (executionSteps.length + 1).toString(),
        title: 'Transaction Execution',
        description: `Failed: ${error.message}`,
        status: 'error' as const,
        type: 'transaction' as const,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      
      setExecutionSteps(prev => [newStep, ...prev.slice(0, 4)]);
    },
  });

  // 真实的网络状态
  type NetworkStatus = {
    name: string;
    chainId: number;
    status: 'connected' | 'standby';
  };

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus[]>([
    { name: 'Arbitrum Sepolia', chainId: arbitrumSepolia.id, status: 'standby' },
    { name: 'Base Sepolia', chainId: baseSepolia.id, status: 'standby' },
    { name: 'Sepolia', chainId: sepolia.id, status: 'standby' },
  ]);

  // 真实的执行状态（初始为空，等待用户操作）
  const [executionSteps, setExecutionSteps] = useState<any[]>([]);

  // 添加消息到日志的辅助函数
  const addMessage = (type: 'success' | 'error' | 'info' | 'warning', content: string) => {
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [newMessage, ...prev.slice(0, 9)]); // 保留最近10条消息
  };

  // 获取前3个资产用于显示
  const topAssets = realAssets.slice(0, 3);

  // 计算总价值
  const displayTotalValue = isConnected && !assetsLoading ? `$${totalBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';

  // 更新网络状态基于实际连接
  useEffect(() => {
    if (isConnected && chainId) {
      setNetworkStatus(prev => prev.map(network => ({
        ...network,
        status: network.chainId === chainId ? 'connected' : 'standby'
      })));
    }
  }, [isConnected, chainId]);

  const handleSendIntent = async () => {
    if (!inputValue.trim()) return;
    
    setIsLoading(true);
    
    try {
      // 调用API路由进行意图解析
      const response = await fetch('/api/parse-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputValue }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        // 添加到消息日志
        addMessage('error', `❌ Intent parsing error: ${result.error}`);
      } else if (result.intent) {
        const confidencePercent = (result.confidence * 100).toFixed(1);
        
        // 更新解析结果状态
        setParseResult({
          type: result.intent.type,
          confidence: result.confidence,
          timestamp: new Date(),
          description: result.intent.description,
        });
        
        // 添加到消息日志
        addMessage('success', `✅ Intent parsed successfully!\nType: ${result.intent.type}\nConfidence: ${confidencePercent}%`);
        
        // 添加真实的执行步骤
        const newStep = {
          id: (executionSteps.length + 1).toString(),
          title: 'Intent Parsing',
          description: `Parsed: "${inputValue.substring(0, 30)}${inputValue.length > 30 ? '...' : ''}"`,
          status: 'success' as const,
          type: 'intent' as const,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        };
        
        setExecutionSteps(prev => [newStep, ...prev.slice(0, 4)]);
        
        console.log('解析的意图:', result.intent);
        
        // 检查技能执行是否就绪
        if (!isReady) {
          addMessage('warning', '⚠️ Skill executor not ready, please try again later or check wallet connection.');
          return;
        }
        
        // 验证意图是否可以执行
        const validation = await validateIntentExecution(result.intent);
        if (!validation.canExecute) {
          addMessage('error', `❌ Cannot execute intent:\n${validation.reasons.join('\n')}`);
          return;
        }
        
        // 询问用户是否确认执行
        const userConfirmed = window.confirm(
          `Confirm execution of ${result.intent.type} operation?\n` +
          `Description: ${result.intent.description}\n` +
          `Chain ID: ${result.intent.chainId}\n\n` +
          `Click "OK" to start transaction execution.`
        );
        
        if (!userConfirmed) {
          addMessage('info', 'Operation cancelled by user.');
          return;
        }
        
        // 执行意图
        addMessage('info', '🚀 Starting transaction execution, please confirm transaction in wallet...');
        const executionResult = await executeIntent(result.intent);
        console.log('执行结果:', executionResult);
        
      } else {
        addMessage('error', 'Unable to parse intent, please try again.');
      }
    } catch (error: any) {
      console.error('意图解析失败:', error);
      addMessage('error', `Intent parsing failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = (listening: boolean) => {
    console.log('Voice listening:', listening);
  };

  // 渲染资产项目
  const renderAssetItem = (asset: any) => {
    if (!asset) return null;
    
    const getAssetColor = (symbol: string) => {
      switch (symbol.toUpperCase()) {
        case 'USDC': return 'blue';
        case 'ETH': return 'gray';
        case 'WBTC': return 'orange';
        case 'DAI': return 'yellow';
        default: return 'blue';
      }
    };
    
    const color = getAssetColor(asset.symbol);
    const colorClasses = {
      blue: 'bg-blue-500/20 text-blue-400',
      gray: 'bg-gray-500/20 text-gray-300',
      orange: 'bg-orange-500/20 text-orange-400',
      yellow: 'bg-yellow-500/20 text-yellow-400',
    };
    
    const changeColor = asset.change24h >= 0 ? 'text-green-400' : 'text-red-400';
    const changeSymbol = asset.change24h >= 0 ? '+' : '';
    
    return (
      <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-tech-darker hover:bg-tech-gray/50 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${colorClasses[color]} flex items-center justify-center`}>
            <span className="font-medium">{asset.symbol.charAt(0)}</span>
          </div>
          <div>
            <div className="font-medium text-white">{asset.symbol}</div>
            <div className="text-xs text-gray-400">{asset.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-white">${asset.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={`text-xs ${changeColor}`}>{changeSymbol}{asset.change24h.toFixed(1)}%</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Wallet and Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          {/* 标题已移除，留空以保持布局 */}
        </div>
        <div className="flex items-center gap-3">
          <WalletConnectButton />
          <ActionButton variant="outline" leftIcon={<Sparkles className="w-4 h-4" />}>
            AI Assistant
          </ActionButton>
        </div>
      </div>

      {/* 主要网格布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: AI Input */}
        <div className="space-y-6">
          {/* AI Input Component */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-ai-blue" />
                {/* 标题已移除 */}
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-ai-blue animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-ai-purple animate-pulse delay-150" />
                  <div className="w-2 h-2 rounded-full bg-ai-magenta animate-pulse delay-300" />
                </div>
              </div>
              <ExecuteIntentButton
                isLoading={isLoading}
                size="sm"
              />
            </div>
            <AgentInput
              value={inputValue}
              onChange={setInputValue}
              isLoading={isLoading}
              onSend={handleSendIntent}
              onVoiceToggle={handleVoiceToggle}
              placeholder="Describe your cross-chain intent... (e.g., Swap 1 ETH from Base to Arbitrum)"
            />

            {/* Embedded Intent Result Display */}
            {(parseResult || messages.length > 0) && (
              <div className="mt-6 space-y-4">
                {/* Intent Parsed Result Card */}
                {parseResult && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      {/* Breathing light dot */}
                      <div className="relative mt-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute opacity-75" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500 relative" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="text-emerald-500/50 text-sm font-medium mb-2">Intent Parsed</h4>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-mono text-xs">Type:</span>
                            <span className="text-white font-medium">{parseResult.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-mono text-xs">Confidence:</span>
                            <span className="text-white font-medium">{(parseResult.confidence * 100).toFixed(1)}%</span>
                          </div>
                          {parseResult.description && (
                            <div className="flex items-start gap-2 mt-2">
                              <span className="text-emerald-400 font-mono text-xs">Desc:</span>
                              <span className="text-gray-300 text-xs">{parseResult.description}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-emerald-400/50">
                        {parseResult.timestamp.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages Log */}
                {messages.length > 0 && (
                  <div className="bg-tech-darker/50 border border-tech-gray rounded-xl p-4 backdrop-blur-sm">
                    <h4 className="text-gray-400 text-sm font-medium mb-3">System Messages</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg border ${
                            msg.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' :
                            msg.type === 'error' ? 'border-red-500/20 bg-red-500/5' :
                            msg.type === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' :
                            'border-blue-500/20 bg-blue-500/5'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                              msg.type === 'success' ? 'bg-emerald-400' :
                              msg.type === 'error' ? 'bg-red-400' :
                              msg.type === 'warning' ? 'bg-yellow-400' :
                              'bg-blue-400'
                            }`} />
                            <div className="flex-1">
                              <div className="text-sm text-white whitespace-pre-line">{msg.content}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {msg.timestamp.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>


        </div>

        {/* Right: Asset Overview and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simplified Asset Overview */}
          <div className="ai-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Asset Overview</h3>
                <p className="text-sm text-gray-400 mt-1">Quick portfolio overview</p>
              </div>
              <a
                href="/assets"
                className="text-sm text-ai-blue hover:text-ai-blue/80 transition-colors flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            {/* Total Value */}
            <div className="mb-6">
              <div className="text-sm text-gray-400">Total Portfolio Value</div>
              <div className="text-3xl font-bold text-white mt-1">{displayTotalValue}</div>
              <div className="flex items-center gap-2 mt-2">
                {isConnected ? (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm text-green-400">Connected</span>
                    </div>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-sm text-gray-400">{realAssets.length} assets</span>
                  </>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-sm text-yellow-400">Wallet not connected</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Assets */}
            <div className="space-y-3">
              {assetsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-ai-blue" />
                  <span className="ml-2 text-gray-400">Loading assets...</span>
                </div>
              ) : topAssets.length > 0 ? (
                topAssets.map(renderAssetItem)
              ) : (
                <div className="text-center py-4 text-gray-400">
                  {isConnected ? 'No assets found' : 'Connect wallet to view assets'}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-tech-gray">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/assets"
                  className="py-2 px-3 rounded-lg bg-tech-gray text-gray-300 hover:bg-tech-light hover:text-white transition-colors text-sm font-medium text-center"
                >
                  Manage Assets
                </a>
                <button
                  className="py-2 px-3 rounded-lg bg-ai-blue/20 text-ai-blue hover:bg-ai-blue/30 transition-colors text-sm font-medium"
                  onClick={() => isConnected ? console.log('Add funds') : alert('Please connect wallet first')}
                >
                  Add Funds
                </button>
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="ai-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Network Status</h3>
            <div className="space-y-3">
              {networkStatus.map((network) => (
                <div key={network.chainId} className="flex items-center justify-between">
                  <span className="text-gray-300">{network.name}</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      network.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                    } animate-pulse`} />
                    <span className={`text-sm ${
                      network.status === 'connected' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {network.status === 'connected' ? 'Connected' : 'Standby'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-tech-gray">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">AI Agent Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-ai-blue animate-pulse" />
                  <span className="text-sm text-ai-blue">Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Footer */}
      <div className="text-center text-gray-500 text-sm pt-6">
        <p>© 2026 Nomad Arc. Built for hackathon.</p>
      </div>
    </div>
  );
}