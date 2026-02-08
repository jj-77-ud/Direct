'use client';

import React, { useState, useRef, useEffect, TextareaHTMLAttributes } from 'react';
import { Bot, Sparkles, Send, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AgentInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showAIButton?: boolean;
  showVoiceButton?: boolean;
  onSend?: () => void;
  onVoiceToggle?: (listening: boolean) => void;
  isLoading?: boolean;
  maxHeight?: number;
}

const AgentInput = ({
  value,
  onChange,
  placeholder = 'Describe your cross-chain intent... (e.g., Swap 1 ETH from Base to Arbitrum)',
  className,
  disabled = false,
  showAIButton = true,
  showVoiceButton = true,
  onSend,
  onVoiceToggle,
  isLoading = false,
  maxHeight = 200,
  ...props
}: AgentInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // 自动调整高度
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleVoiceToggle = () => {
    const newListeningState = !isListening;
    setIsListening(newListeningState);
    onVoiceToggle?.(newListeningState);
    
    // 模拟语音输入（实际项目中应集成 Web Speech API）
    if (newListeningState) {
      setTimeout(() => {
        setIsListening(false);
        onVoiceToggle?.(false);
        // 模拟语音识别结果
        if (!value.includes('Swap')) {
          onChange('Swap 100 USDC for ETH on Arbitrum and bridge 50% to Base');
        }
      }, 2000);
    }
  };

  const handleSend = () => {
    if (value.trim() && onSend) {
      onSend();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* 微光边框效果 */}
      <div className={cn(
        'absolute inset-0 rounded-2xl transition-all duration-300 border',
        isFocused
          ? 'border-purple-500/50 ring-1 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
          : 'border-white/10',
        disabled && 'opacity-50'
      )} />
      
      {/* 主容器 - 透明背景 */}
      <div className={cn(
        'relative overflow-hidden border bg-transparent',
        isFocused ? 'border-purple-500/50' : 'border-white/10',
        disabled && 'opacity-70 cursor-not-allowed'
      )}>
        {/* AI 头部装饰 */}
        {showAIButton && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-tech-gray bg-tech-darker/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-ai-blue/10">
                <Bot className="w-4 h-4 text-ai-blue" />
              </div>
              {/* 标签已移除 */}
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-ai-blue animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-ai-purple animate-pulse delay-150" />
                <div className="w-1.5 h-1.5 rounded-full bg-ai-magenta animate-pulse delay-300" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ai-cyan" />
              <span className="text-xs text-ai-cyan">Ready</span>
            </div>
          </div>
        )}

        {/* 文本输入区域 */}
        <div className="relative p-4">
          {/* 左侧机器人图标 */}
          <div className="absolute left-4 top-4 z-10">
            <Bot className="w-5 h-5 text-white/50" />
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full bg-transparent text-white placeholder:text-gray-400 resize-none outline-none',
              'min-h-[80px] max-h-[200px]',
              'font-mono text-sm leading-relaxed pl-10', /* 添加左边距为图标留出空间 */
              disabled && 'cursor-not-allowed'
            )}
            rows={3}
            {...props}
          />
          
          {/* 输入提示 */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-ai-blue" />
                <span className="text-xs text-gray-400">Natural language</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-ai-purple" />
                <span className="text-xs text-gray-400">Multi‑chain</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-ai-magenta" />
                <span className="text-xs text-gray-400">AI‑optimized</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-400">
              {value.length > 0 ? `${value.length} chars` : 'Press Enter to send'}
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="px-4 py-3 border-t border-tech-gray bg-tech-darker/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showVoiceButton && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={disabled}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  isListening
                    ? 'bg-ai-magenta/20 text-ai-magenta animate-pulse-glow'
                    : 'bg-tech-gray/30 text-gray-400 hover:bg-tech-gray/50 hover:text-white',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
            
            <div className="text-xs text-gray-500">
              {isListening ? 'Listening...' : 'Voice input available'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-ai-blue animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-ai-purple animate-pulse delay-150" />
                <div className="w-2 h-2 rounded-full bg-ai-magenta animate-pulse delay-300" />
                <span className="text-xs text-ai-cyan">Processing...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={disabled || !value.trim()}
                className={cn(
                  'px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300',
                  value.trim()
                    ? 'web3-gradient text-white hover:shadow-lg hover:shadow-ai-blue/30'
                    : 'bg-tech-gray text-gray-500 cursor-not-allowed',
                  'font-medium text-sm'
                )}
              >
                <Send className="w-4 h-4" />
                Execute Intent
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 浮动装饰元素 */}
      {isFocused && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-ai-blue animate-pulse" />
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ai-purple animate-pulse delay-300" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-ai-magenta animate-pulse delay-600" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-ai-cyan animate-pulse delay-900" />
        </>
      )}
    </div>
  );
};

export default AgentInput;