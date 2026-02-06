# Direct Project Architecture Documentation (ARCHITECTURE.md)

## 1. System Overview

Direct is an AI agent-based cross-chain DeFi platform that adopts a skill-based architecture pattern to decouple UI from protocol implementations. The project is built on Next.js 14+ (App Router) for the frontend, uses Tailwind CSS for styling, handles blockchain interactions through Viem and Wagmi, and integrates multiple Web3 protocols (Uniswap v4, LI.FI SDK, Circle CCTP/Arc, ENSjs) to achieve cross-chain intent execution. The core architecture follows the skill pattern, where all third-party protocol calls are encapsulated in the `src/skills/` directory, ensuring complete decoupling between UI components and specific protocol implementations.

## 2. File Function Registry

### Root Configuration Files

| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `package.json` | Configuration File | Defines project dependencies, scripts, and metadata | Node.js, npm/yarn |
| `package-lock.json` | Configuration File | npm dependency lock file, ensures environment consistency | npm |
| `tsconfig.json` | Configuration File | TypeScript compilation configuration | TypeScript |
| `tsconfig.tsnode.json` | Configuration File | TypeScript Node.js runtime configuration | ts-node, typescript |
| `tsconfig.tsbuildinfo` | Configuration File | TypeScript build information cache file | TypeScript |
| `next.config.js` | Configuration File | Next.js application configuration | Next.js |
| `tailwind.config.ts` | Configuration File | Tailwind CSS styling configuration | Tailwind CSS |
| `postcss.config.js` | Configuration File | PostCSS processing configuration, required for Tailwind CSS | postcss, autoprefixer |
| `.env.example` | Configuration File | Environment variable template example | All modules requiring environment variables |
| `.env.local` | Configuration File | Local environment variable file (not committed to version control) | All modules requiring environment variables |
| `.gitignore` | Configuration File | Git ignore file rule definitions | Git |
| `config/project-config.ts` | Configuration File | Unified project configuration (chains, SDKs, contract addresses) | All skills and blockchain modules |

### Skill Architecture Core Files

| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/skills/base-skill.ts` | Core Logic | Skill abstract base class, defines interfaces that all skills must implement | `src/types/agent.ts` |
| `src/skills/skill-manager.ts` | Utility Library | Skill manager, resolves initialization circular dependency issues | `src/skills/base-skill.ts` |
| `src/skills/ens-skill.ts` | Core Logic | ENS domain resolution skill implementation | `@ensdomains/ensjs`, `src/lib/ens.ts` |
| `src/skills/lifi-skill.ts` | Core Logic | LI.FI cross-chain bridging skill implementation (DataCloneError fixed, uses lightweight manual transaction execution strategy) | `@lifi/sdk`, `src/constants/addresses.ts`, `viem` |
| `src/skills/circle-skill.ts` | Core Logic | Circle CCTP cross-chain skill implementation (integrated official @circle-fin/bridge-kit, supports USDC cross-chain transfer) | `@circle-fin/bridge-kit`, `@circle-fin/adapter-viem-v2`, `src/constants/addresses.ts` |
| `src/skills/uniswap-skill.ts` | Core Logic | Uniswap v4 trading skill implementation (integrated real SDK, supports swapping, pool information query, price fetching, etc.) | `@uniswap/v4-sdk`, `@uniswap/sdk-core`, `ethers@^5.0.0`, `src/constants/addresses.ts`, `src/lib/blockchain/providers.ts` |

### AI Intent Parsing System

| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/lib/ai/deepseek-client.ts` | Core Logic | DeepSeek AI client, handles natural language intent parsing | DeepSeek API |
| `src/lib/ai/intent-parser.ts` | Core Logic | Intent parser, connects AI and skill execution | `src/lib/ai/deepseek-client.ts`, `src/types/intent.ts` |
| `src/lib/workflow/orchestrator.ts` | Core Logic | Workflow scheduler, coordinates scheduling and execution of multiple skills | `src/types/agent.ts`, `src/skills/base-skill.ts` |

### Type Definition System

| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/types/base.ts` | Type Definitions | Basic type definitions (address, token, network configuration) | No external dependencies |
| `src/types/blockchain.ts` | Type Definitions | Blockchain-related type definitions | `viem` |
| `src/types/agent.ts` | Type Definitions | AI Agent workflow, state management, and skill scheduling types | `src/types/intent.ts` |
| `src/types/intent.ts` | Type Definitions | Intent type system, defines structured operation intents | `viem` |

### Constants and Configuration

| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/constants/addresses.ts` | Configuration File | Contract address book, supports multi-chain address management | `src/constants/chains.ts` |
| `src/constants/chains.ts` | Configuration File | Chain configuration definitions | No external dependencies |
| `src/constants/abis.ts` | Configuration File | Smart contract ABI definitions | No external dependencies |

### Utility Libraries and Helper Functions

#### Protocol SDK Wrappers
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/lib/ens.ts` | Utility Library | ENS domain resolution utility functions, provides forward/reverse resolution interfaces | `@ensdomains/ensjs`, `viem` |
| `src/lib/lifi.ts` | Utility Library | LI.FI SDK wrapper utility functions, provides cross-chain routing and quote interfaces | `@lifi/sdk`, `viem` |

#### Blockchain Infrastructure
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/lib/blockchain/providers.ts` | Utility Library | Blockchain Provider management, supports multi-chain RPC configuration | `viem`, `wagmi`, environment variables |
| `src/lib/blockchain/transaction.ts` | Utility Library | Transaction building, sending, confirmation, and status tracking utilities | `viem`, `wagmi` |

#### Uniswap-Specific Utilities
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/lib/uniswap/state-view.ts` | Utility Library | Uniswap pool state query, price calculation, and liquidity analysis | `@uniswap/v4-sdk`, `@uniswap/sdk-core`, `viem` |
| `src/lib/uniswap/transaction-builder.ts` | Utility Library | Uniswap transaction building, parameter encoding, and gas estimation | `@uniswap/v4-sdk`, `viem`, `src/constants/addresses.ts` |

#### General Utility Functions
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/lib/utils/format.ts` | Utility Library | Data formatting utility functions (amounts, addresses, time, etc.) | No external dependencies |
| `src/lib/utils/validation.ts` | Utility Library | Data validation utility functions (address, amount, parameter validation) | No external dependencies |

### Frontend Architecture

#### Application Layout Components
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/app/layout.tsx` | UI Component | Application root layout component, includes wallet connection and navigation | Next.js, Tailwind CSS, RainbowKit |
| `src/app/page.tsx` | UI Component | Application main page component (AI intent input and result display) | Next.js, React |
| `src/app/globals.css` | Styling File | Global style definitions, Tailwind CSS base configuration | Tailwind CSS |

#### React Hook System
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/hooks/use-assets.ts` | React Hook | Manages user asset balances and token information | `wagmi`, `viem`, `src/constants/addresses.ts` |
| `src/hooks/use-intent.ts` | React Hook | Handles AI intent parsing, execution status, and result management | `src/lib/ai/intent-parser.ts`, `src/lib/workflow/orchestrator.ts` |
| `src/hooks/use-transaction.ts` | React Hook | Manages blockchain transaction status, confirmation, and error handling | `wagmi`, `viem`, `src/lib/blockchain/transaction.ts` |

#### UI Component Library
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `src/components/ui/error-boundary.tsx` | UI Component | Error boundary component, captures and displays React errors | React |
| `src/components/ui/` (directory) | Component Directory | UI component library directory, future extension component storage location | React, Tailwind CSS |

### Test Script System

#### Core Functionality Tests
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `scripts/test-bridge.ts` | Test Script | LI.FI cross-chain functionality test script | `src/skills/lifi-skill.ts` |
| `scripts/test-lifi-sandbox.ts` | Test Script | LI.FI sandbox test script, verifies private key loading, USDC balance checking, and bridging functionality | `src/skills/lifi-skill.ts`, `viem`, `src/constants/addresses.ts` |
| `scripts/test-swap.ts` | Test Script | Uniswap swap functionality test script | `src/skills/uniswap-skill.ts` |
| `scripts/test-ens-integrated.ts` | Test Script | ENS integrated functionality test script | `src/skills/ens-skill.ts` |
| `scripts/test-lifi-skill.ts` | Test Script | LI.FI skill complete functionality test | `src/skills/lifi-skill.ts` |
| `scripts/test-uniswap-integration.ts` | Test Script | Uniswap SDK integration test | `@uniswap/v4-sdk` |
| `scripts/test-uniswap-unit.ts` | Test Script | Uniswap unit test script, verifies core functionality | `src/skills/uniswap-skill.ts` |

#### Verification and Diagnostic Scripts
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `scripts/test-lifi-error-details.ts` | Diagnostic Script | LI.FI error detail analysis tool, diagnoses cross-chain error causes | `@lifi/sdk`, `viem` |
| `scripts/verify-fixes.ts` | Verification Script | Fix verification tool | None |

#### Real On-Chain Tests
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `scripts/test-uniswap-real.ts` | Real Test | Uniswap real on-chain functionality test | `src/skills/uniswap-skill.ts` |
| `scripts/real-circle-test.ts` | Real Test | Circle CCTP real environment test | `src/skills/circle-skill.ts` |
| `scripts/test-lifi-real.ts` | Real Test | LI.FI real on-chain test script, performs 100% real on-chain interactions on BuildBear Arbitrum fork | `viem`, `@lifi/sdk`, `src/constants/addresses.ts` |
| `scripts/test-lifi-real-validation.ts` | Real Test | LI.FI real on-chain interaction verification script, verifies transaction receipts and configuration correctness | `viem`, `@lifi/sdk`, `src/constants/addresses.ts` |
| `scripts/execute-real-transfer.ts` | Real Test | Real Circle CCTP cross-chain transaction execution script | `src/skills/circle-skill.ts` |
| `scripts/test-usdc-approve.ts` | Real Test | USDC approval functionality test script, verifies token approval logic | `viem`, `src/constants/addresses.ts` |
| `scripts/test-wallet-config.ts` | Real Test | Wallet configuration test script, verifies private key loading and wallet creation | `viem` |
| `scripts/test-signer-serialization.ts` | Real Test | Signer serialization test, verifies cross-environment signer compatibility | `viem` |

#### Tool and Helper Scripts
| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `scripts/convert-mnemonic-to-privatekey.ts` | Tool Script | Mnemonic to private key conversion tool | `ethers`, `viem` |
| `scripts/load-env.ts` | Tool Script | Environment variable loading and verification tool | `dotenv` |
| `scripts/explore-uniswap-sdk.ts` | Exploration Script | Uniswap SDK functionality exploration | `@uniswap/v4-sdk` |
| `scripts/test-utils.ts` | Tool Script | General test utility functions | None |
| `scripts/manual-lifi-execution.ts` | Tool Script | Manual LI.FI execution script, for debugging and manual testing | `@lifi/sdk`, `viem` |

### Documentation and Configuration

| File Path | Type | One-Sentence Function | Key Dependencies |
|-----------|------|----------------------|------------------|
| `docs/bounty-requirements-verification.md` | Documentation | Bounty requirements verification documentation | None |
| `docs/environment-config-guide.md` | Documentation | Environment configuration guide | None |
| `docs/task-tracking-history.md` | Documentation | Task tracking history record | None |
| `docs/tech-stack-reference.md` | Documentation | Tech stack reference documentation | None |
| `docs/skill-configs/README.md` | Documentation | Skill configuration system overview and index | None |
| `docs/skill-configs/lifi-config.md` | Documentation | LI.FI skill complete configuration guide | `src/skills/lifi-skill.ts` |
| `docs/skill-configs/circle-config.md` | Documentation | Circle CCTP skill complete configuration guide | `src/skills/circle-skill.ts` |
| `docs/skill-configs/uniswap-config.md` | Documentation | Uniswap v4 skill complete configuration guide | `src/skills/uniswap-skill.ts` |
| `docs/skill-configs/ens-config.md` | Documentation | ENS skill complete configuration guide | `src/skills/ens-skill.ts` |
| `docs/skill-configs/ai-config.md` | Documentation | AI system complete configuration guide | `src/lib/ai/deepseek-client.ts` |
| `配置.md` | Documentation | Project configuration instructions (Chinese) | None |
| `配置circle&uniswap.md` | Documentation | Circle and Uniswap configuration instructions | None |
| `配置lifi.md` | Documentation | LI.FI configuration instructions | None |

## 3. Key Data Structures

### Basic Types (`src/types/base.ts`)
- `Address`: Ethereum address type (`0x${string}`)
- `Hash`: Transaction hash type (`0x${string}`)
- `TokenInfo`: Token information interface (address, symbol, name, decimals, etc.)
- `BlockchainNetwork`: Blockchain network configuration interface

### Intent Types (`src/types/intent.ts`)
- `IntentType`: Intent type enumeration (RESOLVE_ENS, SWAP, BRIDGE, CCTP_TRANSFER, etc.)
- `NomadIntent`: Core intent interface, includes ID, type, parameters, chain ID, etc.
- `SwapParams`: Token swap parameter interface
- `BridgeParams`: Cross-chain bridging parameter interface
- `CctpTransferParams`: Circle CCTP cross-chain parameter interface
- `IntentResult`: Intent execution result interface

### Agent Types (`src/types/agent.ts`)
- `AgentStatus`: Agent execution status enumeration
- `AgentContext`: Agent execution context interface (user address, chain ID, balances, etc.)
- `SkillMetadata`: Skill metadata interface
- `ISkill`: Skill interface definition
- `SkillExecutionResult`: Skill execution result interface
- `WorkflowStep`: Workflow step interface
- `WorkflowPlan`: Workflow execution plan interface
- `AgentSession`: Agent session interface

### Skill Configuration Types
- `EnsSkillConfig` (`src/skills/ens-skill.ts`): ENS skill configuration interface
- `LiFiSkillConfig` (`src/skills/lifi-skill.ts`): LI.FI skill configuration interface
- `CircleSkillConfig` (`src/skills/circle-skill.ts`): Circle CCTP skill configuration interface
- `UniswapSkillConfig` (`src/skills/uniswap-skill.ts`): Uniswap skill configuration interface

### Execution Result Types
- `LiFiQuote` (`src/skills/lifi-skill.ts`): LI.FI quote result interface
- `LiFiExecutionResult` (`src/skills/lifi-skill.ts`): LI.FI execution result interface
- `CCTPTransferResult` (`src/skills/circle-skill.ts`): CCTP cross-chain result interface
- `SwapResult` (`src/skills/uniswap-skill.ts`): Swap result interface

## 4. Core Architecture Patterns

### Skill-Based Architecture
- **Core Principle**: All third-party protocol calls must be encapsulated in `src/skills/`
- **Decoupling Requirement**: UI components are strictly prohibited from directly calling `@lifi/sdk` or `PoolManager`, they can only call concise functions exposed by `src/skills/`
- **Skill Lifecycle**: Initialization → Parameter validation → Execution → Result processing
- **Skill Registry**: All skill instances are managed through the `SkillRegistry` singleton

### AI Intent Workflow
1. **Intent Parsing**: User natural language → `IntentParser` → Structured `NomadIntent`
2. **Workflow Creation**: `WorkflowOrchestrator` converts intent into `WorkflowPlan`
3. **Skill Scheduling**: Executes `WorkflowStep` in dependency order, each step calls corresponding skill
4. **Result Aggregation**: Collects all skill execution results, returns complete intent execution result

### Bounty Implementation
- **Uniswap v4**: Interacts with PoolManager on Arbitrum Sepolia through `UniswapSkill`
- **Circle CCTP**: Implements USDC cross-chain transfer through `CircleSkill`
- **LI.FI**: Demonstrates how AI Agent makes routing decisions based on quotes through `LiFiSkill`
- **ENS**: Implements bidirectional `.eth` domain resolution logic through `EnsSkill`

## 5. Key Dependencies

### External Dependencies (package.json)
- **Frontend Framework**: `next`, `react`, `react-dom`
- **Styling**: `tailwindcss`, `postcss`, `autoprefixer`
- **Blockchain**: `viem`, `wagmi`, `@wagmi/core`, `@rainbow-me/rainbowkit`
- **Protocol SDKs**: `@aboutcircles/sdk`, `@uniswap/v4-sdk`, `@lifi/sdk`, `@ensdomains/ensjs`
- **Development Tools**: `typescript`, `jest`, `eslint`, `prettier`, `husky`

### Internal Dependency Graph
```
AI Intent Parser → Workflow Orchestrator → Skill Registry
      ↓                    ↓                    ↓
DeepSeek Client    Workflow Steps        Individual Skills
                                      (ENS, LI.FI, Circle, Uniswap)
```

## 6. Environment Variable Requirements

### Required Environment Variables
- `DEEPSEEK_API_KEY`: DeepSeek AI API key
- `NEXT_PUBLIC_LIFI_API_KEY`: LI.FI API key
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: WalletConnect project ID

### Blockchain RPC Endpoints
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC`: Arbitrum Sepolia RPC URL
- `NEXT_PUBLIC_BASE_SEPOLIA_RPC`: Base Sepolia RPC URL
- `NEXT_PUBLIC_SEPOLIA_RPC`: Sepolia RPC URL

## 7. Development Guide

### Adding New Skills
1. Create new skill file in `src/skills/`, inheriting from `BaseSkill`
2. Implement `metadata` property and abstract methods (`onInitialize`, `onExecute`, `onEstimate`)
3. Add initialization function in `src/skills/skill-manager.ts`
4. Update skill-related types in `src/types/agent.ts` (if needed)
5. Create test scripts to verify functionality

### Modifying Intent Types
1. Update `IntentType` enumeration in `src/types/intent.ts`
2. Add new parameter interfaces (e.g., `NewIntentParams`)
3. Update union types in `NomadIntent`
4. Add type guard functions (e.g., `isNewIntent`)
5. Add corresponding step creation logic in `src/lib/workflow/orchestrator.ts`

### Running Tests
```bash
# Run all test scripts
npm run test:scripts

# Run specific tests
npx ts-node scripts/test-intent.ts
npx ts-node scripts/test-bridge.ts
npx ts-node scripts/test-swap.ts
```

## 8. Important Notes

1. **Security First**: Strictly prohibit hardcoding private keys, API Keys in code, must use `.env.local`
2. **Type Safety**: Use TypeScript strict mode, prohibit using `any` type
3. **BigInt Handling**: All token amounts must be processed using `viem`'s `parseUnits`/`formatUnits`
4. **Error Handling**: All on-chain interactions must include comprehensive `try-catch` logic
5. **Skill Decoupling**: UI components can only interact with protocols through skill interfaces, strictly prohibit direct SDK calls

---

## 9. Project Build and Deployment

### Development Environment Setup
1. **Environment Variable Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local to set all required variables
   ```

2. **Dependency Installation**
   ```bash
   npm install
   ```

3. **Development Server Startup**
   ```bash
   npm run dev
   ```

### Test Script Execution
```bash
# Run all tests
npm run test:scripts

# Run specific test categories
npm run test:circle    # Circle CCTP tests
npm run test:lifi      # LI.FI tests
npm run test:uniswap   # Uniswap tests
npm run test:intent    # Intent parsing tests
```

### Production Build
```bash
# Build production version
npm run build

# Start production server
npm start

# Or deploy using Vercel
vercel deploy --prod
```

### Environment Management
- **Development Environment**: Use testnet RPC and test API keys
- **Staging Environment**: Use testnet but with production-like configuration
- **Production Environment**: Use mainnet RPC and production API keys

---

## 10. Security and Auditing

### Environment Variable Security
- **No Hardcoding**: All keys must be managed through environment variables
- **Tiered Access**: Different environments use different keys
- **Regular Rotation**: Production environment keys should be rotated regularly
- **Key Storage**: Use secure key management services (e.g., Vercel environment variables, AWS Secrets Manager)

### Code Auditing Requirements
1. **Smart Contract Auditing**: All deployed contracts must undergo security audits
2. **Dependency Auditing**: Regularly check dependency packages for security vulnerabilities (use `npm audit`)
3. **Permission Auditing**: Verify user confirmation process for all transactions
4. **Input Validation**: All user input must undergo strict validation

### Monitoring and Logging
- **Transaction Monitoring**: Monitor status of all on-chain transactions
- **Error Tracking**: Use Sentry or similar tools for error tracking
- **Performance Monitoring**: Monitor API response times and resource usage

---

## 12. Changelog

### 2026-02-05: Created LI.FI Sandbox Test Script
#### New Content
1. **LI.FI Sandbox Test Script**:
   - Created `scripts/test-lifi-sandbox.ts` script for testing LI.FI cross-chain bridging functionality
   - Implemented loading private key from `CIRCLE_DEMO_PRIVATE_KEY` environment variable and creating signer
   - Implemented USDC balance checking functionality, verifying faucet fund receipt
   - Implemented LI.FI quote fetching and decision logic testing, demonstrating how AI Agent makes routing decisions based on quotes

2. **Feature Characteristics**:
   - **Secure Private Key Loading**: Securely loads private key from environment variable, verifies format and length
   - **Balance Verification**: Checks USDC balance, confirms faucet fund receipt
   - **LI.FI Integration Testing**: Tests LI.FI skill quote fetching and decision logic
   - **Error Handling**: Comprehensive error handling and logging mechanism
   - **Bounty Requirement Verification**: Verified LI.FI bounty requirements (AI Agent makes routing decisions based on quotes)

#### Technical Implementation
- **Private Key Management**: Uses `viem`'s `privateKeyToAccount` to create secure wallet client
- **Balance Checking**: Creates public client via `createChainClient` to read USDC contract balance
- **Skill Testing**: Integrates `src/skills/lifi-skill.ts` for quote fetching and decision testing
- **Testing Tools**: Uses test utility functions from `scripts/test-utils.ts`

#### File Changes
1. `scripts/test-lifi-sandbox.ts` - New LI.FI sandbox test script
2. `AI_MANIFEST.md` - Updated documentation records, added new script entry

#### Verification Method
Run test script to verify functionality:
```bash
# Set environment variables
export CIRCLE_DEMO_PRIVATE_KEY=0x519bd77b77b775cf0766546dcef72bf47fdc64006c01101ae84b2f7f76cdc6cb

# Run test script
npx ts-node scripts/test-lifi-sandbox.ts
```

### 2026-02-03: Completed Missing Content in AI_MANIFEST.md
#### New Content
1. **File Function Registry Completion**:
   - Added missing build configuration files (postcss.config.js, tsconfig.tsnode.json, etc.)
   - Completed system records for 28 test scripts
   - Added frontend Hook system (use-assets.ts, use-intent.ts, use-transaction.ts)
   - Added Uniswap utility libraries (state-view.ts, transaction-builder.ts)

2. **Architecture Section Expansion**:
   - Added "Project Build and Deployment" section
   - Added "Security and Auditing" section
   - Improved development environment setup and test script execution guide

3. **Documentation Structure Optimization**:
   - Reorganized test script categories (core functionality tests, verification and diagnostics, real on-chain tests, tools and helpers)
   - Refined utility library categories (protocol SDK wrappers, blockchain infrastructure, Uniswap-specific tools, general utility functions)
   - Updated frontend architecture description

#### Technical Implementation
- **Completeness Check**: Compared actual file structure with documentation records, identified missing content
- **Categorization**: Reorganized file records by functional modules
- **Practical Guide**: Added specific development, testing, and deployment guides

### 2026-02-01: Fixed Circle CCTP Skill RPC Configuration and Test Wallet Configuration

#### Issue Fixes
1. **RPC Endpoint Configuration Fix**:
   - Fixed missing testnet RPC configuration in `getAdapter` method in `src/skills/circle-skill.ts`
   - Configured public testnet RPC for Arbitrum Sepolia and Base Sepolia
   - Example RPCs:
     - Arbitrum Sepolia: `https://sepolia-rollup.arbitrum.io/rpc`
     - Base Sepolia: `https://sepolia.base.org`

2. **Test Wallet Configuration**:
   - Added `CIRCLE_DEMO_PRIVATE_KEY` environment variable in `.env.example`
   - Test account configuration for demonstrating cross-chain functionality

3. **Environment Variable Configuration Improvement**:
   - Ensured Circle skill can correctly read RPC configuration from environment variables
   - Supports reading configuration from `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC`, `NEXT_PUBLIC_BASE_SEPOLIA_RPC`, `NEXT_PUBLIC_SEPOLIA_RPC`

#### Technical Implementation
- **Circle Skill Adapter Fix**: Used correct `createViemAdapterFromPrivateKey` API, implemented `getPublicClient` factory function that dynamically selects RPC endpoints based on chain ID
- **Type Safety**: Fixed TypeScript type errors, ensured `getAdapter` method complies with `@circle-fin/adapter-viem-v2` type definitions
- **Test Script Enhancement**: Updated `scripts/test-circle-skill.ts`, added RPC configuration checks and environment variable verification

#### File Changes
1. `src/skills/circle-skill.ts` - Fixed `getAdapter` method, added correct RPC configuration logic
2. `.env.example` - Added `CIRCLE_DEMO_PRIVATE_KEY` environment variable
3. `scripts/test-circle-skill.ts` - Enhanced test script, verifies RPC configuration
4. `AI_MANIFEST.md` - Updated documentation records

#### Verification Method
Run test script to verify configuration:
```bash
# Use npm script
npm run test:circle

# Or directly use ts-node
npx ts-node scripts/test-circle-skill.ts
```

---

*Last Updated: 2026-02-05*
