# Direct 项目架构文档 (ARCHITECTURE.md)

## 1. 架构摘要 (System Overview)

Direct 是一个基于 AI 代理的跨链 DeFi 平台，采用技能架构模式实现 UI 与具体协议实现的解耦。项目基于 Next.js 14+ (App Router) 构建前端，使用 Tailwind CSS 进行样式设计，通过 Viem 和 Wagmi 处理区块链交互，并集成多个 Web3 协议（Uniswap v4、LI.FI SDK、Circle CCTP/Arc、ENSjs）实现跨链意图执行。核心架构遵循技能模式，所有第三方协议调用都封装在 `src/skills/` 目录下，确保 UI 组件与具体协议实现完全解耦。

## 2. 文件功能注册表 (File Registry)

### 根目录配置文件

| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `package.json` | 配置文件 | 定义项目依赖、脚本和元数据 | Node.js, npm/yarn |
| `package-lock.json` | 配置文件 | npm 依赖锁定文件，确保环境一致性 | npm |
| `tsconfig.json` | 配置文件 | TypeScript 编译配置 | TypeScript |
| `tsconfig.tsnode.json` | 配置文件 | TypeScript Node.js 运行时配置 | ts-node, typescript |
| `tsconfig.tsbuildinfo` | 配置文件 | TypeScript 构建信息缓存文件 | TypeScript |
| `next.config.js` | 配置文件 | Next.js 应用配置 | Next.js |
| `tailwind.config.ts` | 配置文件 | Tailwind CSS 样式配置 | Tailwind CSS |
| `postcss.config.js` | 配置文件 | PostCSS 处理配置，Tailwind CSS 必需 | postcss, autoprefixer |
| `.env.example` | 配置文件 | 环境变量模板示例 | 所有需要环境变量的模块 |
| `.env.local` | 配置文件 | 本地环境变量文件（不提交到版本控制） | 所有需要环境变量的模块 |
| `.gitignore` | 配置文件 | Git 忽略文件规则定义 | Git |
| `config/project-config.ts` | 配置文件 | 统一项目配置（链、SDK、合约地址） | 所有技能和区块链模块 |

### 技能架构核心文件

| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/skills/base-skill.ts` | 核心逻辑 | 技能抽象基类，定义所有技能必须实现的接口 | `src/types/agent.ts` |
| `src/skills/skill-manager.ts` | 工具库 | 技能管理器，解决初始化循环依赖问题 | `src/skills/base-skill.ts` |
| `src/skills/ens-skill.ts` | 核心逻辑 | ENS 域名解析技能实现 | `@ensdomains/ensjs`, `src/lib/ens.ts` |
| `src/skills/lifi-skill.ts` | 核心逻辑 | LI.FI 跨链桥接技能实现（已修复 DataCloneError，采用轻量化手动交易执行策略） | `@lifi/sdk`, `src/constants/addresses.ts`, `viem` |
| `src/skills/circle-skill.ts` | 核心逻辑 | Circle CCTP 跨链技能实现（已集成官方 @circle-fin/bridge-kit，支持 USDC 跨链转移） | `@circle-fin/bridge-kit`, `@circle-fin/adapter-viem-v2`, `src/constants/addresses.ts` |
| `src/skills/uniswap-skill.ts` | 核心逻辑 | Uniswap v4 交易技能实现（已集成真实 SDK，支持兑换、池信息查询、价格获取等功能） | `@uniswap/v4-sdk`, `@uniswap/sdk-core`, `ethers@^5.0.0`, `src/constants/addresses.ts`, `src/lib/blockchain/providers.ts` |

### AI 意图解析系统

| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/lib/ai/deepseek-client.ts` | 核心逻辑 | DeepSeek AI 客户端，处理自然语言意图解析 | DeepSeek API |
| `src/lib/ai/intent-parser.ts` | 核心逻辑 | 意图解析器，连接 AI 和技能执行 | `src/lib/ai/deepseek-client.ts`, `src/types/intent.ts` |
| `src/lib/workflow/orchestrator.ts` | 核心逻辑 | 工作流调度器，协调多个技能的调度执行 | `src/types/agent.ts`, `src/skills/base-skill.ts` |

### 类型定义系统

| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/types/base.ts` | 类型定义 | 基础类型定义（地址、代币、网络配置） | 无外部依赖 |
| `src/types/blockchain.ts` | 类型定义 | 区块链相关类型定义 | `viem` |
| `src/types/agent.ts` | 类型定义 | AI Agent 工作流、状态管理和技能调度类型 | `src/types/intent.ts` |
| `src/types/intent.ts` | 类型定义 | 意图类型系统，定义结构化操作意图 | `viem` |

### 常量与配置

| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/constants/addresses.ts` | 配置文件 | 合约地址簿，支持多链地址管理 | `src/constants/chains.ts` |
| `src/constants/chains.ts` | 配置文件 | 链配置定义 | 无外部依赖 |
| `src/constants/abis.ts` | 配置文件 | 智能合约 ABI 定义 | 无外部依赖 |

### 工具库与工具函数

#### 协议SDK封装
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/lib/ens.ts` | 工具库 | ENS 域名解析工具函数，提供正向/反向解析接口 | `@ensdomains/ensjs`, `viem` |
| `src/lib/lifi.ts` | 工具库 | LI.FI SDK 封装工具函数，提供跨链路由和报价接口 | `@lifi/sdk`, `viem` |

#### 区块链基础设施
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/lib/blockchain/providers.ts` | 工具库 | 区块链 Provider 管理，支持多链RPC配置 | `viem`, `wagmi`, 环境变量 |
| `src/lib/blockchain/transaction.ts` | 工具库 | 交易构建、发送、确认和状态跟踪工具 | `viem`, `wagmi` |

#### Uniswap专用工具
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/lib/uniswap/state-view.ts` | 工具库 | Uniswap池状态查询、价格计算和流动性分析 | `@uniswap/v4-sdk`, `@uniswap/sdk-core`, `viem` |
| `src/lib/uniswap/transaction-builder.ts` | 工具库 | Uniswap交易构建、参数编码和Gas估算 | `@uniswap/v4-sdk`, `viem`, `src/constants/addresses.ts` |

#### 通用工具函数
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/lib/utils/format.ts` | 工具库 | 数据格式化工具函数（金额、地址、时间等） | 无外部依赖 |
| `src/lib/utils/validation.ts` | 工具库 | 数据验证工具函数（地址、金额、参数校验） | 无外部依赖 |

### 前端架构

#### 应用布局组件
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/app/layout.tsx` | UI组件 | 应用根布局组件，包含钱包连接和导航 | Next.js, Tailwind CSS, RainbowKit |
| `src/app/page.tsx` | UI组件 | 应用主页面组件（AI意图输入和结果显示） | Next.js, React |
| `src/app/globals.css` | 样式文件 | 全局样式定义，Tailwind CSS基础配置 | Tailwind CSS |

#### React Hook系统
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/hooks/use-assets.ts` | React Hook | 管理用户资产余额和代币信息 | `wagmi`, `viem`, `src/constants/addresses.ts` |
| `src/hooks/use-intent.ts` | React Hook | 处理AI意图解析、执行状态和结果管理 | `src/lib/ai/intent-parser.ts`, `src/lib/workflow/orchestrator.ts` |
| `src/hooks/use-transaction.ts` | React Hook | 管理区块链交易状态、确认和错误处理 | `wagmi`, `viem`, `src/lib/blockchain/transaction.ts` |

#### UI组件库
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `src/components/ui/error-boundary.tsx` | UI组件 | 错误边界组件，捕获并显示React错误 | React |
| `src/components/ui/` (目录) | 组件目录 | UI组件库目录，未来扩展组件存放位置 | React, Tailwind CSS |

### 测试脚本系统

#### 核心功能测试
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `scripts/test-bridge.ts` | 测试脚本 | LI.FI 跨链功能测试脚本 | `src/skills/lifi-skill.ts` |
| `scripts/test-lifi-sandbox.ts` | 测试脚本 | LI.FI 沙箱测试脚本，验证私钥加载、USDC余额检查和桥接功能 | `src/skills/lifi-skill.ts`, `viem`, `src/constants/addresses.ts` |
| `scripts/test-lifi-simple.ts` | 测试脚本 | LI.FI 简化测试脚本，验证基本私钥加载和金额解析功能 | `viem` |
| `scripts/test-swap.ts` | 测试脚本 | Uniswap 兑换功能测试脚本 | `src/skills/uniswap-skill.ts` |
| `scripts/test-ens-integrated.ts` | 测试脚本 | ENS 集成功能测试脚本 | `src/skills/ens-skill.ts` |
| `scripts/test-lifi-skill.ts` | 测试脚本 | LI.FI 技能完整功能测试 | `src/skills/lifi-skill.ts` |
| `scripts/test-uniswap-integration.ts` | 测试脚本 | Uniswap SDK 集成测试 | `@uniswap/v4-sdk` |
| `scripts/test-uniswap-unit.ts` | 测试脚本 | Uniswap 单元测试脚本，验证核心功能 | `src/skills/uniswap-skill.ts` |

#### 验证与诊断脚本
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `scripts/check-chain-ids.ts` | 验证脚本 | 验证支持的区块链ID配置 | `src/constants/chains.ts` |
| `scripts/check-usdc-decimals.ts` | 验证脚本 | 验证USDC代币小数位数 | `viem`, `src/constants/addresses.ts` |
| `scripts/check-wallet-balance.ts` | 验证脚本 | 检查钱包余额和代币持有情况 | `viem`, `src/lib/blockchain/providers.ts` |
| `scripts/check-uniswap-abi.ts` | 验证脚本 | 验证Uniswap合约ABI配置 | `src/constants/abis.ts` |
| `scripts/check-lifi-supported-chains.js` | 验证脚本 | 检查LI.FI支持的网络列表 | `@lifi/sdk` |
| `scripts/diagnose-stateview.ts` | 诊断脚本 | Uniswap状态视图诊断工具 | `src/lib/uniswap/state-view.ts` |
| `scripts/debug-route-structure.ts` | 诊断脚本 | LI.FI 路由结构调试工具，分析跨链路由配置 | `@lifi/sdk` |
| `scripts/test-lifi-error-details.ts` | 诊断脚本 | LI.FI 错误详情分析工具，诊断跨链错误原因 | `@lifi/sdk`, `viem` |
| `scripts/verify-fixes.ts` | 验证脚本 | 修复问题验证工具 | 无 |

#### 真实链上测试
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `scripts/test-real-integration.js` | 真实测试 | 真实SDK集成验证 | 所有技能模块 |
| `scripts/test-uniswap-real.ts` | 真实测试 | Uniswap真实链上功能测试 | `src/skills/uniswap-skill.ts` |
| `scripts/real-circle-test.ts` | 真实测试 | Circle CCTP真实环境测试 | `src/skills/circle-skill.ts` |
| `scripts/test-lifi-buildbear.ts` | 真实测试 | LI.FI BuildBear沙箱测试，在分叉链上测试真实跨链功能 | `viem`, `@lifi/sdk`, `src/constants/addresses.ts` |
| `scripts/test-lifi-real.ts` | 真实测试 | LI.FI 真实链上测试脚本，在BuildBear Arbitrum分叉上进行100%真实链上交互 | `viem`, `@lifi/sdk`, `src/constants/addresses.ts` |
| `scripts/test-lifi-real-validation.ts` | 真实测试 | LI.FI 真实链上交互验证脚本，验证交易回执和配置正确性 | `viem`, `@lifi/sdk`, `src/constants/addresses.ts` |
| `scripts/execute-real-transfer.ts` | 真实测试 | 真实的 Circle CCTP 跨链交易执行脚本 | `src/skills/circle-skill.ts` |
| `scripts/test-usdc-approve.ts` | 真实测试 | USDC 授权功能测试脚本，验证代币授权逻辑 | `viem`, `src/constants/addresses.ts` |
| `scripts/test-wallet-config.ts` | 真实测试 | 钱包配置测试脚本，验证私钥加载和钱包创建 | `viem` |
| `scripts/test-signer-serialization.ts` | 真实测试 | 签名者序列化测试，验证跨环境签名者兼容性 | `viem` |

#### 工具与辅助脚本
| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `scripts/convert-mnemonic-to-privatekey.ts` | 工具脚本 | 助记词转换为私钥工具 | `ethers`, `viem` |
| `scripts/load-env.ts` | 工具脚本 | 环境变量加载和验证工具 | `dotenv` |
| `scripts/explore-uniswap-sdk.ts` | 探索脚本 | Uniswap SDK功能探索 | `@uniswap/v4-sdk` |
| `scripts/test-utils.ts` | 工具脚本 | 通用测试工具函数 | 无 |
| `scripts/test-lifi-config.js` | 配置测试 | LI.FI配置验证测试 | `@lifi/sdk` |
| `scripts/manual-lifi-execution.ts` | 工具脚本 | 手动LI.FI执行脚本，用于调试和手动测试 | `@lifi/sdk`, `viem` |
| `scripts/test-lifi-complete-fix.ts` | 工具脚本 | LI.FI完整修复测试脚本，验证所有修复功能 | `@lifi/sdk`, `viem` |

### 文档与配置

| 文件路径 | 类型 | 功能一句话 | 关键依赖 |
|---------|------|-----------|----------|
| `docs/bounty-requirements-verification.md` | 文档 | 金主奖项要求验证文档 | 无 |
| `docs/environment-config-guide.md` | 文档 | 环境配置指南 | 无 |
| `docs/task-tracking-history.md` | 文档 | 任务跟踪历史记录 | 无 |
| `docs/tech-stack-reference.md` | 文档 | 技术栈参考文档 | 无 |
| `docs/skill-configs/README.md` | 文档 | 技能配置系统概述和索引 | 无 |
| `docs/skill-configs/lifi-config.md` | 文档 | LI.FI 技能完整配置指南 | `src/skills/lifi-skill.ts` |
| `docs/skill-configs/circle-config.md` | 文档 | Circle CCTP 技能完整配置指南 | `src/skills/circle-skill.ts` |
| `docs/skill-configs/uniswap-config.md` | 文档 | Uniswap v4 技能完整配置指南 | `src/skills/uniswap-skill.ts` |
| `docs/skill-configs/ens-config.md` | 文档 | ENS 技能完整配置指南 | `src/skills/ens-skill.ts` |
| `docs/skill-configs/ai-config.md` | 文档 | AI 系统完整配置指南 | `src/lib/ai/deepseek-client.ts` |
| `配置.md` | 文档 | 项目配置说明（中文） | 无 |
| `配置circle&uniswap.md` | 文档 | Circle 和 Uniswap 配置说明 | 无 |
| `配置lifi.md` | 文档 | LI.FI 配置说明 | 无 |

## 3. 关键数据结构 (Key Data Structures)

### 基础类型 (`src/types/base.ts`)
- `Address`: 以太坊地址类型 (`0x${string}`)
- `Hash`: 交易哈希类型 (`0x${string}`)
- `TokenInfo`: 代币信息接口（地址、符号、名称、小数位数等）
- `BlockchainNetwork`: 区块链网络配置接口

### 意图类型 (`src/types/intent.ts`)
- `IntentType`: 意图类型枚举（RESOLVE_ENS, SWAP, BRIDGE, CCTP_TRANSFER 等）
- `NomadIntent`: 核心意图接口，包含 ID、类型、参数、链 ID 等
- `SwapParams`: 代币兑换参数接口
- `BridgeParams`: 跨链桥接参数接口
- `CctpTransferParams`: Circle CCTP 跨链参数接口
- `IntentResult`: 意图执行结果接口

### Agent 类型 (`src/types/agent.ts`)
- `AgentStatus`: Agent 执行状态枚举
- `AgentContext`: Agent 执行上下文接口（用户地址、链 ID、余额等）
- `SkillMetadata`: 技能元数据接口
- `ISkill`: 技能接口定义
- `SkillExecutionResult`: 技能执行结果接口
- `WorkflowStep`: 工作流步骤接口
- `WorkflowPlan`: 工作流执行计划接口
- `AgentSession`: Agent 会话接口

### 技能配置类型
- `EnsSkillConfig` (`src/skills/ens-skill.ts`): ENS 技能配置接口
- `LiFiSkillConfig` (`src/skills/lifi-skill.ts`): LI.FI 技能配置接口
- `CircleSkillConfig` (`src/skills/circle-skill.ts`): Circle CCTP 技能配置接口
- `UniswapSkillConfig` (`src/skills/uniswap-skill.ts`): Uniswap 技能配置接口

### 执行结果类型
- `LiFiQuote` (`src/skills/lifi-skill.ts`): LI.FI 报价结果接口
- `LiFiExecutionResult` (`src/skills/lifi-skill.ts`): LI.FI 执行结果接口
- `CCTPTransferResult` (`src/skills/circle-skill.ts`): CCTP 跨链结果接口
- `SwapResult` (`src/skills/uniswap-skill.ts`): 兑换结果接口

## 4. 核心架构模式

### 技能架构模式 (Skill-based Architecture)
- **核心原则**: 所有第三方协议调用必须封装在 `src/skills/` 下
- **解耦要求**: UI 组件严禁直接调用 `@lifi/sdk` 或 `PoolManager`，只能调用 `src/skills/` 暴露的简洁函数
- **技能生命周期**: 初始化 → 参数验证 → 执行 → 结果处理
- **技能注册表**: 通过 `SkillRegistry` 单例管理所有技能实例

### AI 意图工作流
1. **意图解析**: 用户自然语言 → `IntentParser` → 结构化 `NomadIntent`
2. **工作流创建**: `WorkflowOrchestrator` 将意图转换为 `WorkflowPlan`
3. **技能调度**: 按依赖顺序执行 `WorkflowStep`，每个步骤调用对应技能
4. **结果聚合**: 收集所有技能执行结果，返回完整意图执行结果

### 金主奖项实现
- **Uniswap v4**: 通过 `UniswapSkill` 与 Arbitrum Sepolia 上 PoolManager 交互
- **Circle CCTP**: 通过 `CircleSkill` 实现 USDC 的跨链转移
- **LI.FI**: 通过 `LiFiSkill` 展示 AI Agent 如何根据报价做出路径决策
- **ENS**: 通过 `EnsSkill` 实现 `.eth` 域名的双向解析逻辑

## 5. 重要依赖关系

### 外部依赖 (package.json)
- **前端框架**: `next`, `react`, `react-dom`
- **样式**: `tailwindcss`, `postcss`, `autoprefixer`
- **区块链**: `viem`, `wagmi`, `@wagmi/core`, `@rainbow-me/rainbowkit`
- **协议 SDK**: `@aboutcircles/sdk`, `@uniswap/v4-sdk`, `@lifi/sdk`, `@ensdomains/ensjs`
- **开发工具**: `typescript`, `jest`, `eslint`, `prettier`, `husky`

### 内部依赖图
```
AI Intent Parser → Workflow Orchestrator → Skill Registry
      ↓                    ↓                    ↓
DeepSeek Client    Workflow Steps        Individual Skills
                                      (ENS, LI.FI, Circle, Uniswap)
```

## 6. 环境变量要求

### 必需环境变量
- `DEEPSEEK_API_KEY`: DeepSeek AI API 密钥
- `NEXT_PUBLIC_LIFI_API_KEY`: LI.FI API 密钥
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: WalletConnect 项目 ID

### 区块链 RPC 端点
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC`: Arbitrum Sepolia RPC URL
- `NEXT_PUBLIC_BASE_SEPOLIA_RPC`: Base Sepolia RPC URL
- `NEXT_PUBLIC_SEPOLIA_RPC`: Sepolia RPC URL

## 7. 开发指南

### 添加新技能
1. 在 `src/skills/` 下创建新技能文件，继承 `BaseSkill`
2. 实现 `metadata` 属性和抽象方法 (`onInitialize`, `onExecute`, `onEstimate`)
3. 在 `src/skills/skill-manager.ts` 中添加初始化函数
4. 在 `src/types/agent.ts` 中更新技能相关类型（如果需要）
5. 创建测试脚本验证功能

### 修改意图类型
1. 在 `src/types/intent.ts` 中更新 `IntentType` 枚举
2. 添加新的参数接口（如 `NewIntentParams`）
3. 更新 `NomadIntent` 的联合类型
4. 添加类型守卫函数（如 `isNewIntent`）
5. 在 `src/lib/workflow/orchestrator.ts` 中添加对应的步骤创建逻辑

### 运行测试
```bash
# 运行所有测试脚本
npm run test:scripts

# 运行特定测试
npx ts-node scripts/test-intent.ts
npx ts-node scripts/test-bridge.ts
npx ts-node scripts/test-swap.ts
```

## 8. 注意事项

1. **安全第一**: 严禁将私钥、API Key 硬编码在代码中，必须使用 `.env.local`
2. **类型安全**: 使用 TypeScript 严格模式，禁止使用 `any` 类型
3. **BigInt 处理**: 所有的代币金额必须使用 `viem` 的 `parseUnits`/`formatUnits` 处理
4. **错误处理**: 所有的链上交互必须包含完善的 `try-catch` 逻辑
5. **技能解耦**: UI 组件只能通过技能接口与协议交互，严禁直接调用 SDK

---

## 9. 项目构建与部署

### 开发环境设置
1. **环境变量配置**
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local 设置所有必需变量
   ```

2. **依赖安装**
   ```bash
   npm install
   ```

3. **开发服务器启动**
   ```bash
   npm run dev
   ```

### 测试脚本运行
```bash
# 运行所有测试
npm run test:scripts

# 运行特定测试类别
npm run test:circle    # Circle CCTP测试
npm run test:lifi      # LI.FI测试
npm run test:uniswap   # Uniswap测试
npm run test:intent    # 意图解析测试
```

### 生产构建
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 或者使用 Vercel 部署
vercel deploy --prod
```

### 环境管理
- **开发环境**: 使用测试网RPC和测试API密钥
- **预发布环境**: 使用测试网但接近生产配置
- **生产环境**: 使用主网RPC和生产API密钥

---

## 10. 安全与审计

### 环境变量安全
- **严禁硬编码**: 所有密钥必须通过环境变量管理
- **分级访问**: 不同环境使用不同密钥
- **定期轮换**: 生产环境密钥定期更换
- **密钥存储**: 使用安全的密钥管理服务（如Vercel环境变量、AWS Secrets Manager）

### 代码审计要求
1. **智能合约审计**: 所有部署的合约必须经过安全审计
2. **依赖审计**: 定期检查依赖包的安全漏洞（使用 `npm audit`）
3. **权限审计**: 验证所有交易的用户确认流程
4. **输入验证**: 所有用户输入必须经过严格验证

### 监控与日志
- **交易监控**: 监控所有链上交易状态
- **错误追踪**: 使用Sentry或类似工具追踪错误
- **性能监控**: 监控API响应时间和资源使用

---

## 12. 更新日志

### 2026-02-05: 创建 LI.FI 沙箱测试脚本
#### 新增内容
1. **LI.FI 沙箱测试脚本**:
   - 创建了 `scripts/test-lifi-sandbox.ts` 脚本，用于测试 LI.FI 跨链桥接功能
   - 实现了从 `CIRCLE_DEMO_PRIVATE_KEY` 环境变量加载私钥并创建 signer
   - 实现了 USDC 余额检查功能，验证水龙头资金到账情况
   - 实现了 LI.FI 报价获取和决策逻辑测试，展示 AI Agent 如何根据报价做出路径决策

2. **功能特性**:
   - **私钥安全加载**: 从环境变量安全加载私钥，验证格式和长度
   - **余额验证**: 检查 USDC 余额，确认水龙头资金是否到账
   - **LI.FI 集成测试**: 测试 LI.FI 技能报价获取和决策逻辑
   - **错误处理**: 完善的错误处理和日志记录机制
   - **奖金要求验证**: 验证了 LI.FI 奖金要求（AI Agent 根据报价做出路径决策）

#### 技术实现
- **私钥管理**: 使用 `viem` 的 `privateKeyToAccount` 创建安全钱包客户端
- **余额检查**: 通过 `createChainClient` 创建公共客户端读取 USDC 合约余额
- **技能测试**: 集成 `src/skills/lifi-skill.ts` 进行报价获取和决策测试
- **测试工具**: 使用 `scripts/test-utils.ts` 中的测试工具函数

#### 文件变更
1. `scripts/test-lifi-sandbox.ts` - 新增 LI.FI 沙箱测试脚本
2. `AI_MANIFEST.md` - 更新文档记录，添加新脚本条目

#### 验证方法
运行测试脚本验证功能:
```bash
# 设置环境变量
export CIRCLE_DEMO_PRIVATE_KEY=0x519bd77b77b775cf0766546dcef72bf47fdc64006c01101ae84b2f7f76cdc6cb

# 运行测试脚本
npx ts-node scripts/test-lifi-sandbox.ts
```

### 2026-02-03: 补全 AI_MANIFEST.md 文件缺失内容
#### 新增内容
1. **文件功能注册表补全**:
   - 添加了缺失的构建配置文件（postcss.config.js, tsconfig.tsnode.json等）
   - 补全了28个测试脚本的系统记录
   - 添加了前端Hook系统（use-assets.ts, use-intent.ts, use-transaction.ts）
   - 添加了Uniswap工具库（state-view.ts, transaction-builder.ts）

2. **架构章节扩展**:
   - 新增"项目构建与部署"章节
   - 新增"安全与审计"章节
   - 完善了开发环境设置和测试脚本运行指南

3. **文档结构优化**:
   - 重新组织了测试脚本分类（核心功能测试、验证与诊断、真实链上测试、工具与辅助）
   - 细化了工具库分类（协议SDK封装、区块链基础设施、Uniswap专用工具、通用工具函数）
   - 更新了前端架构描述

#### 技术实现
- **完整性检查**: 对比实际文件结构与文档记录，识别缺失内容
- **分类整理**: 按功能模块重新组织文件记录
- **实用指南**: 添加了具体的开发、测试和部署指南

### 2026-02-01: 修复 Circle CCTP 技能 RPC 配置和测试钱包配置

#### 问题修复
1. **RPC 端点配置修复**:
   - 修复了 `src/skills/circle-skill.ts` 中 `getAdapter` 方法缺少测试网 RPC 配置的问题
   - 为 Arbitrum Sepolia 和 Base Sepolia 配置了公共测试网 RPC
   - 示例 RPC:
     - Arbitrum Sepolia: `https://sepolia-rollup.arbitrum.io/rpc`
     - Base Sepolia: `https://sepolia.base.org`

2. **测试钱包配置**:
   - 在 `.env.example` 中添加了 `CIRCLE_DEMO_PRIVATE_KEY` 环境变量
   - 用于演示跨链功能的测试账户配置

3. **环境变量配置完善**:
   - 确保 Circle 技能能够正确读取环境变量中的 RPC 配置
   - 支持从 `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC`、`NEXT_PUBLIC_BASE_SEPOLIA_RPC`、`NEXT_PUBLIC_SEPOLIA_RPC` 读取配置

#### 技术实现
- **Circle 技能适配器修复**: 使用正确的 `createViemAdapterFromPrivateKey` API，实现了 `getPublicClient` 工厂函数，根据链 ID 动态选择 RPC 端点
- **类型安全**: 修复了 TypeScript 类型错误，确保 `getAdapter` 方法符合 `@circle-fin/adapter-viem-v2` 的类型定义
- **测试脚本增强**: 更新了 `scripts/test-circle-skill.ts`，添加了 RPC 配置检查和环境变量验证

#### 文件变更
1. `src/skills/circle-skill.ts` - 修复 `getAdapter` 方法，添加正确的 RPC 配置逻辑
2. `.env.example` - 添加 `CIRCLE_DEMO_PRIVATE_KEY` 环境变量
3. `scripts/test-circle-skill.ts` - 增强测试脚本，验证 RPC 配置
4. `AI_MANIFEST.md` - 更新文档记录

#### 验证方法
运行测试脚本验证配置:
```bash
# 使用 npm 脚本
npm run test:circle

# 或者直接使用 ts-node
npx ts-node scripts/test-circle-skill.ts
```

---

*最后更新: 2026-02-05*
