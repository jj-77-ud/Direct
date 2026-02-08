'use client';

import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, Check, AlertCircle, ExternalLink, ArrowRight, Zap } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'destructive';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  pulseEffect?: boolean;
  glowEffect?: boolean;
  web3Gradient?: boolean;
}

const ActionButton = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isSuccess = false,
  isError = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  pulseEffect = false,
  glowEffect = false,
  web3Gradient = true,
  className,
  ...props
}: ActionButtonProps) => {
  // 基础样式
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-tech-dark disabled:opacity-50 disabled:cursor-not-allowed';
  
  // 尺寸样式
  const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
    xl: 'px-6 py-3.5 text-base',
  };

  // 变体样式
  const variantStyles = {
    primary: 'bg-ai-blue text-white hover:bg-ai-blue/90 focus:ring-ai-blue',
    secondary: 'bg-tech-gray text-gray-200 hover:bg-tech-light focus:ring-tech-light',
    outline: 'border border-tech-gray text-white hover:bg-tech-gray/30 focus:ring-tech-gray',
    ghost: 'text-gray-300 hover:bg-tech-gray/30 hover:text-white focus:ring-tech-gray',
    destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    gradient: web3Gradient 
      ? 'web3-gradient text-white hover:shadow-lg hover:shadow-ai-blue/30 focus:ring-ai-blue'
      : 'ai-gradient text-white hover:shadow-lg hover:shadow-ai-purple/30 focus:ring-ai-purple',
  };

  // 加载状态图标
  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 className="animate-spin" />;
    }
    if (isSuccess) {
      return <Check className="text-green-400" />;
    }
    if (isError) {
      return <AlertCircle className="text-red-400" />;
    }
    return null;
  };

  // 脉冲效果
  const pulseClass = pulseEffect ? 'animate-pulse-glow' : '';
  const glowClass = glowEffect ? 'ai-glow' : '';

  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        pulseClass,
        glowClass,
        'relative overflow-hidden',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* 闪烁背景效果 */}
      {(glowEffect || variant === 'gradient') && (
        <div className="absolute inset-0 ai-shimmer" />
      )}

      {/* 内容容器 */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {/* 左侧图标 */}
        {!isLoading && !isSuccess && !isError && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* 状态图标 */}
        {(isLoading || isSuccess || isError) && (
          <span className="flex-shrink-0 mr-2">
            {renderIcon()}
          </span>
        )}

        {/* 子内容 */}
        <span className="whitespace-nowrap">{children}</span>

        {/* 右侧图标 */}
        {!isLoading && !isSuccess && !isError && rightIcon && (
          <span className="flex-shrink-0 ml-1">{rightIcon}</span>
        )}

        {/* 特殊图标 */}
        {variant === 'gradient' && !rightIcon && !isLoading && !isSuccess && !isError && (
          <ArrowRight className="w-4 h-4 ml-1 flex-shrink-0" />
        )}
      </div>

      {/* 装饰元素 */}
      {variant === 'gradient' && !disabled && (
        <>
          <div className="absolute top-0 left-0 w-1 h-full bg-white/20 animate-shimmer" />
          <div className="absolute top-1 -right-1 w-2 h-2 rounded-full bg-ai-blue animate-pulse" />
          <div className="absolute bottom-1 -left-1 w-2 h-2 rounded-full bg-ai-purple animate-pulse delay-300" />
        </>
      )}
    </button>
  );
};

// 预定义的特殊按钮组件 - 使用我们增强的钱包连接按钮
export const ConnectWalletButton = (props: Omit<ActionButtonProps, 'children' | 'variant' | 'leftIcon'>) => {
  // 直接使用 ActionButton 作为回退，实际的钱包连接逻辑在组件内部处理
  // 注意：由于 RainbowKit 的 ConnectButton 需要客户端环境，我们保持原有实现
  // 但添加了更好的错误处理和自动检测
  
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <ActionButton
                    variant="gradient"
                    leftIcon={<Zap className="w-4 h-4" />}
                    pulseEffect
                    onClick={openConnectModal}
                    {...props}
                  >
                    连接钱包
                  </ActionButton>
                );
              }

              if (chain.unsupported) {
                return (
                  <ActionButton
                    variant="destructive"
                    onClick={openChainModal}
                    {...props}
                  >
                    错误的网络
                  </ActionButton>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <ActionButton
                    variant="outline"
                    onClick={openChainModal}
                    style={{ display: 'flex', alignItems: 'center' }}
                    {...props}
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </ActionButton>

                  <ActionButton
                    variant="gradient"
                    onClick={openAccountModal}
                    {...props}
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </ActionButton>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export const ExecuteIntentButton = (props: Omit<ActionButtonProps, 'children' | 'variant' | 'leftIcon'>) => (
  <ActionButton
    variant="gradient"
    leftIcon={<Zap className="w-4 h-4" />}
    glowEffect
    {...props}
  >
    Execute Intent
  </ActionButton>
);

export const ViewOnExplorerButton = (props: Omit<ActionButtonProps, 'children' | 'variant' | 'rightIcon'>) => (
  <ActionButton
    variant="outline"
    rightIcon={<ExternalLink className="w-4 h-4" />}
    size="sm"
    {...props}
  >
    View on Explorer
  </ActionButton>
);

export const ApproveTokenButton = (props: Omit<ActionButtonProps, 'children' | 'variant'> & { token?: string }) => {
  const { token = 'USDC', ...rest } = props;
  return (
    <ActionButton
      variant="primary"
      leftIcon={<Check className="w-4 h-4" />}
      size="md"
      {...rest}
    >
      Approve {token}
    </ActionButton>
  );
};

export const ConfirmTransactionButton = (props: Omit<ActionButtonProps, 'children' | 'variant' | 'leftIcon'>) => (
  <ActionButton
    variant="gradient"
    leftIcon={<ArrowRight className="w-4 h-4" />}
    pulseEffect
    {...props}
  >
    Confirm Transaction
  </ActionButton>
);

export default ActionButton;