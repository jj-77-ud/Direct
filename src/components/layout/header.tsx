'use client';

import React, { useState } from 'react';
import { Menu, X, Bot, Zap, Network, Bell, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectWalletButton } from '@/components/ui/action-button';
import { NetworkSwitcher } from '@/components/ui/network-switcher';

interface HeaderProps {
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

export function Header({ onMenuToggle, sidebarOpen = true }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications] = useState(3);

  return (
    <header className="sticky top-0 z-50 border-b border-tech-gray bg-tech-dark/90 backdrop-blur-lg">
      <div className="px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* 左侧：Logo 和菜单按钮 */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-lg hover:bg-tech-gray text-gray-400 hover:text-white lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-ai-blue to-ai-purple">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-ai-blue via-ai-purple to-ai-magenta bg-clip-text text-transparent">
                  Nomad Arc
                </h1>
                <p className="text-xs text-gray-400">AI Cross-Chain DeFi</p>
              </div>
            </div>
          </div>


          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-3">
            {/* 通知按钮 */}
            <button className="relative p-2 rounded-lg hover:bg-tech-gray text-gray-400 hover:text-white">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-xs font-bold text-white flex items-center justify-center">
                  {notifications}
                </div>
              )}
            </button>

            {/* 设置按钮 */}
            <button className="p-2 rounded-lg hover:bg-tech-gray text-gray-400 hover:text-white">
              <Settings className="w-5 h-5" />
            </button>

            {/* 网络切换器 */}
            <NetworkSwitcher />

            {/* 钱包连接按钮 - 使用自定义按钮 */}
            <div className="hidden sm:block">
              <ConnectWalletButton />
            </div>
            
            {/* 移动端简化按钮 */}
            <div className="sm:hidden">
              <ConnectWalletButton size="sm" />
            </div>
          </div>
        </div>

      </div>

    </header>
  );
}