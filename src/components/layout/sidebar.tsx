'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Bot,
  Wallet,
  Network,
  GitMerge,
  Layers,
  BarChart3,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Globe,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  active?: boolean;
  subItems?: NavItem[];
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');

  // 导航项
  const navItems: NavItem[] = [
    {
      id: 'ai-intent',
      label: 'AI Intent',
      icon: <Bot className="w-5 h-5" />,
      href: '/',
      badge: 'New',
      active: activeItem === 'ai-intent',
    },
    {
      id: 'assets',
      label: 'Assets',
      icon: <Wallet className="w-5 h-5" />,
      href: '/assets',
      active: activeItem === 'assets',
    },
    {
      id: 'history',
      label: 'History',
      icon: <History className="w-5 h-5" />,
      href: '#',
      active: activeItem === 'history',
    },
  ];

  return (
    <aside className={cn(
      'hidden lg:flex flex-col border-r border-tech-gray bg-tech-dark transition-all duration-300',
      collapsed ? 'w-20' : 'w-64'
    )}>
      {/* 折叠按钮 */}
      <div className="p-4 border-b border-tech-gray flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-ai-blue to-ai-purple">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-white">Nomad Arc</span>
          </div>
        )}
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-tech-gray text-gray-400 hover:text-white"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 导航项 */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <div key={item.id}>
            <Link
              href={item.href || '#'}
              onClick={() => setActiveItem(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                item.active
                  ? 'bg-gradient-to-r from-ai-blue/20 to-ai-purple/20 text-white border border-ai-blue/30'
                  : 'text-gray-400 hover:text-white hover:bg-tech-gray',
                collapsed && 'justify-center'
              )}
            >
              <div className={cn(
                'flex-shrink-0',
                item.active ? 'text-ai-blue' : 'text-gray-400'
              )}>
                {item.icon}
              </div>
              
              {!collapsed && (
                <>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-ai-blue/20 text-ai-blue">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>

            {/* 子项 */}
            {!collapsed && item.subItems && (
              <div className="ml-10 mt-1 space-y-1">
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-tech-gray/50 transition-colors"
                  >
                    <span className="flex-shrink-0">{subItem.icon}</span>
                    <span className="flex-1 text-left">{subItem.label}</span>
                    {subItem.badge && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-tech-gray text-gray-300">
                        {subItem.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 网络连接 */}
      {!collapsed && (
        <div className="p-4 border-t border-tech-gray">
          <div className="p-3 rounded-lg bg-tech-darker">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Network</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">Connected</span>
              </div>
            </div>
            <div className="text-xs text-gray-300">Arbitrum Sepolia</div>
          </div>
        </div>
      )}

      {/* 折叠时的最小化视图 - 仅保留分隔线 */}
      {collapsed && (
        <div className="p-4 border-t border-tech-gray">
          {/* 空内容，仅保留分隔线 */}
        </div>
      )}

      {/* 代理状态 */}
      <div className={cn(
        'p-4 border-t border-tech-gray',
        collapsed ? 'flex justify-center' : ''
      )}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {!collapsed && <span className="text-xs text-gray-400">AI Agent Connected</span>}
        </div>
      </div>
    </aside>
  );
}