'use client';

import React, { useState } from 'react';
import AssetTile, { AssetGroup } from '@/components/ui/asset-tile';
import { Wallet, Filter, Search, ArrowUpDown, Globe, Download, Loader2, AlertCircle } from 'lucide-react';
import { useAssets } from '@/hooks/use-assets';

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChain, setFilterChain] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value' | 'name' | 'change'>('value');

  // 使用真实的资产数据
  const { assets: demoAssets, isLoading, error, totalBalanceUSD: totalValue } = useAssets();

  // 过滤和排序资产
  const filteredAssets = demoAssets
    .filter(asset => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          asset.symbol.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query)
        );
      }
      if (filterChain !== 'all') {
        return asset.chainId.toString() === filterChain;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.balanceUSD - a.balanceUSD;
        case 'name':
          return a.symbol.localeCompare(b.symbol);
        case 'change':
          return b.change24h - a.change24h;
        default:
          return 0;
      }
    });

  // 链信息
  const chains = [
    { id: 'all', name: 'All Chains', count: demoAssets.length },
    { id: '421614', name: 'Arbitrum Sepolia', count: demoAssets.filter(a => a.chainId === 421614).length },
    { id: '84532', name: 'Base Sepolia', count: demoAssets.filter(a => a.chainId === 84532).length },
    { id: '11155111', name: 'Sepolia', count: demoAssets.filter(a => a.chainId === 11155111).length },
  ];

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 rounded-full bg-tech-darker">
          <Loader2 className="w-12 h-12 text-ai-blue animate-spin" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Loading assets...</h3>
          <p className="text-gray-400">Fetching your wallet data from blockchain</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 rounded-full bg-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Failed to load assets</h3>
          <p className="text-gray-400 max-w-md">{error.message || 'Unable to fetch asset data'}</p>
          <button
            className="mt-4 px-4 py-2 rounded-lg bg-tech-gray text-white hover:bg-tech-gray/80 transition-colors"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-ai-blue" />
            Asset Management
          </h1>
          <p className="text-gray-400 mt-2">
            View and manage your assets across all connected chains. Total portfolio value: 
            <span className="text-white font-semibold ml-2">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-lg bg-tech-gray text-gray-300 hover:text-white hover:bg-tech-gray/80 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="ai-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-white mt-1">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-full bg-ai-blue/20">
              <Wallet className="w-6 h-6 text-ai-blue" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-tech-gray">
            <p className="text-xs text-gray-400">Across {demoAssets.length} assets</p>
          </div>
        </div>

        <div className="ai-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">24h Change</p>
              <p className="text-2xl font-bold text-green-400 mt-1">+$452.75</p>
            </div>
            <div className="p-3 rounded-full bg-green-500/20">
              <ArrowUpDown className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-tech-gray">
            <p className="text-xs text-gray-400">+1.83% overall</p>
          </div>
        </div>

        <div className="ai-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Chains</p>
              <p className="text-2xl font-bold text-white mt-1">3</p>
            </div>
            <div className="p-3 rounded-full bg-ai-purple/20">
              <Globe className="w-6 h-6 text-ai-purple" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-tech-gray">
            <p className="text-xs text-gray-400">Cross-chain assets</p>
          </div>
        </div>
      </div>

      {/* 过滤和搜索栏 */}
      <div className="ai-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets by name or symbol..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-tech-darker border border-tech-gray text-white placeholder-gray-500 focus:outline-none focus:border-ai-blue"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                className="px-3 py-2 rounded-lg bg-tech-darker border border-tech-gray text-white text-sm focus:outline-none focus:border-ai-blue"
                value={filterChain}
                onChange={(e) => setFilterChain(e.target.value)}
              >
                {chains.map(chain => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name} ({chain.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select 
                className="px-3 py-2 rounded-lg bg-tech-darker border border-tech-gray text-white text-sm focus:outline-none focus:border-ai-blue"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="value">Sort by Value</option>
                <option value="name">Sort by Name</option>
                <option value="change">Sort by 24h Change</option>
              </select>
            </div>
          </div>
        </div>

        {/* 资产列表 */}
        <AssetGroup
          title="Your Assets"
          description={`${filteredAssets.length} assets found`}
          assets={filteredAssets}
          totalValue={filteredAssets.reduce((sum, asset) => sum + asset.balanceUSD, 0)}
        />

        {/* 空状态 */}
        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tech-darker mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No assets found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              No assets match your search criteria. Try adjusting your filters or search query.
            </p>
          </div>
        )}
      </div>

      {/* 链分布 */}
      <div className="ai-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Chain Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chains.filter(c => c.id !== 'all').map(chain => {
            const chainAssets = demoAssets.filter(a => a.chainId.toString() === chain.id);
            const chainValue = chainAssets.reduce((sum, asset) => sum + asset.balanceUSD, 0);
            const percentage = totalValue > 0 ? (chainValue / totalValue * 100).toFixed(1) : 0;
            
            return (
              <div key={chain.id} className="p-4 rounded-lg bg-tech-darker">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-white">{chain.name}</span>
                  <span className="text-sm text-gray-400">{chainAssets.length} assets</span>
                </div>
                <div className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">${chainValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-sm text-gray-400">({percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-tech-gray rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-ai-blue to-ai-purple rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}