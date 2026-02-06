# Direct 技能配置系统

## 概述

本文档是 Nomad Arc 项目的技能配置中心，采用技能专属配置文档架构。每个技能都有独立的配置文档，确保配置的清晰性、可维护性和安全性。

## 配置文档索引

| 技能 | 配置文档 | 描述 | 最后更新 |
|------|----------|------|----------|
| **LI.FI** | [lifi-config.md](./lifi-config.md) | LI.FI 跨链桥接技能配置 | 2026-02-04 |
| **Circle CCTP** | [circle-config.md](./circle-config.md) | Circle CCTP USDC 跨链技能配置 | 2026-02-04 |
| **Uniswap v4** | [uniswap-config.md](./uniswap-config.md) | Uniswap v4 交易和流动性技能配置 | 2026-02-04 |
| **ENS** | [ens-config.md](./ens-config.md) | ENS 域名解析技能配置 | 2026-02-04 |
| **AI 系统** | [ai-config.md](./ai-config.md) | AI 意图解析系统配置 | 2026-02-04 |

## 配置层级架构

```
环境变量 (.env.local)        # 最高优先级，包含敏感信息
  ↓
项目配置 (config/project-config.ts) # 运行时配置
  ↓
技能默认配置 (技能内部)      # 默认值和回退配置
  ↓
配置文档 (docs/skill-configs/) # 文档和最佳实践
```

## 快速开始

### 1. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local 文件，填入你的配置
```

### 2. 配置验证
```bash
# 运行配置验证脚本
npm run validate-config
```

### 3. 技能配置
1. 查看对应技能的配置文档
2. 按照文档说明配置环境变量
3. 运行技能测试脚本验证配置

## 配置最佳实践

### 安全第一
- **敏感信息**（API密钥、私钥）必须通过环境变量管理
- 使用 `.env.example` 作为模板，`.env.local` 存储实际值
- 配置文件不应包含真实密钥，只包含占位符

### 单一事实来源
- 每个配置项只在一个地方定义
- 避免在文档和代码中重复相同的配置
- 使用代码作为主要配置源，文档作为说明

### 版本控制
- 配置变更应该有清晰的版本历史
- 重大配置变更需要更新 `CHANGELOG.md`
- 配置模板应该与代码版本同步

## 环境变量命名规范

为了确保环境变量命名的一致性和可维护性，所有技能配置必须遵循以下命名规范：

### 通用规则
- 前缀格式：`[技能名称]_[功能]_[具体项]`
- 技能名称：AI, CIRCLE, ENS, LIFI, UNISWAP（大写）
- 功能分类：API, RPC, PRIVATE_KEY, DEBUG, CACHE, CONFIG
- 具体项：描述具体内容

### 具体规范
1. **API配置**：`[技能]_API_KEY`, `[技能]_API_URL`, `[技能]_INTEGRATOR`
2. **RPC配置**：`[链]_RPC_URL`（如 `ARBITRUM_SEPOLIA_RPC_URL`）
3. **私钥**：`[技能]_PRIVATE_KEY`
4. **调试**：`DEBUG_[技能]`
5. **缓存**：`[技能]_CACHE_TTL`, `[技能]_CACHE_ENABLED`
6. **其他**：`[技能]_MAX_RETRIES`, `[技能]_TIMEOUT`, `[技能]_SLIPPAGE`

### 示例
```bash
# AI 系统
AI_TIMEOUT=30000
DEBUG_AI=false
AI_CACHE_TTL=300000

# Circle CCTP
CIRCLE_PRIVATE_KEY=0x...
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# ENS
ENS_TESTNET_RPC_URL=https://rpc.sepolia.org
ENS_CACHE_TTL=300000

# LI.FI
LIFI_API_KEY=your_api_key_here
LIFI_INTEGRATOR=Nomad_Arc

# Uniswap
UNISWAP_PRIVATE_KEY=0x...
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

## 故障排除

### 常见问题
1. **配置不生效**：检查环境变量是否正确加载
2. **API 密钥错误**：验证密钥格式和权限
3. **合约地址错误**：确认链 ID 和网络匹配

### 调试工具
```bash
# 查看当前配置状态
npm run debug-config

# 验证特定技能配置
npm run validate-config -- --skill=lifi
```

## 贡献指南

### 添加新技能配置
1. 在 `docs/skill-configs/` 目录下创建新的配置文档
2. 遵循统一的文档模板
3. 更新本 README 中的索引表
4. 更新 `AI_MANIFEST.md` 中的文件注册表

### 更新现有配置
1. 修改对应的技能配置文档
2. 如果需要，更新 `config/project-config.ts`
3. 更新版本号和最后更新日期
4. 在 `CHANGELOG.md` 中添加变更记录

## 相关资源

- [项目主配置](../config/project-config.ts) - 运行时配置
- [环境变量模板](../.env.example) - 环境变量模板
- [AI_MANIFEST.md](../AI_MANIFEST.md) - 项目文件索引
- [配置验证脚本](../scripts/validate-config.ts) - 配置验证工具

---

**最后更新**: 2026-02-04  
**维护者**: Nomad Arc 团队  
**版本**: 1.0.0