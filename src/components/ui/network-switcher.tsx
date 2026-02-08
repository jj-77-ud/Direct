'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { ChevronDown, Check, AlertCircle, Loader2, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { arbitrumSepolia, baseSepolia, sepolia } from 'viem/chains';

const SUPPORTED_CHAINS = [
  { 
    id: arbitrumSepolia.id, 
    name: 'Arbitrum Sepolia', 
    shortName: 'Arbitrum',
    color: 'bg-blue-500',
  },
  { 
    id: baseSepolia.id, 
    name: 'Base Sepolia', 
    shortName: 'Base',
    color: 'bg-blue-400',
  },
  { 
    id: sepolia.id, 
    name: 'Sepolia', 
    shortName: 'Sepolia',
    color: 'bg-purple-500',
  },
];

export function NetworkSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();
  
  const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.network-switcher-container')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);
  
  if (!isConnected) return null;
  
  const handleNetworkSwitch = (chainId: number) => {
    switchChain({ chainId });
    setIsOpen(false);
  };
  
  return (
    <div className="network-switcher-container relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl",
          "bg-tech-darker border border-tech-gray",
          "hover:bg-tech-gray/50 transition-all duration-300",
          "text-sm font-medium text-white",
          "hover:shadow-lg hover:shadow-blue-500/10",
          "group relative overflow-hidden"
        )}
      >
        {/* 背景闪烁效果 */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        
        <div className="relative z-10 flex items-center gap-2">
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-ai-blue" />
          ) : currentChain ? (
            <>
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${currentChain.color} animate-pulse`} />
                <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              </div>
              <span className="hidden sm:inline">{currentChain.shortName}</span>
              <span className="sm:hidden">
                <Network className="w-4 h-4" />
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="hidden sm:inline">Unsupported</span>
            </>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </div>
      </button>
      
      {/* 错误提示 */}
      {error && (
        <div className="absolute top-full right-0 mt-2 w-64 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm z-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Network Switch Failed</div>
              <div className="text-xs opacity-80 mt-1">{error.message}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 rounded-xl bg-tech-dark border border-tech-gray shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3">
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border-b border-tech-gray mb-2">
              <Network className="w-4 h-4" />
              <span>Select Network</span>
            </div>
            
            <div className="space-y-1">
              {SUPPORTED_CHAINS.map((chain) => {
                const isCurrent = chain.id === chainId;
                const isSwitching = isPending && chain.id === chainId;
                
                return (
                  <button
                    key={chain.id}
                    onClick={() => handleNetworkSwitch(chain.id)}
                    disabled={isPending}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-3 rounded-lg",
                      "hover:bg-tech-gray/50 transition-all duration-200",
                      "text-sm text-white",
                      isCurrent && "bg-tech-gray/30",
                      "group/item"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${chain.color}`} />
                        {isCurrent && (
                          <div className="absolute -inset-1 rounded-full bg-blue-500/20 animate-ping" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{chain.name}</div>
                        <div className="text-xs text-gray-400">Chain ID: {chain.id}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isSwitching ? (
                        <Loader2 className="w-4 h-4 animate-spin text-ai-blue" />
                      ) : isCurrent ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <Check className="w-4 h-4 text-green-400" />
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-3 pt-3 border-t border-tech-gray">
              <div className="px-3 py-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Connected</span>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span>Standby</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}