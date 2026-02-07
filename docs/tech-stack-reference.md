# Direct Tech Stack & Project Structure

## 📋 Project Overview
**Direct: AI‑Driven Cross‑Chain Intent Commander (Intent Commander)**

An AI‑agent‑based cross‑chain DeFi platform where users can execute complex multi‑chain asset operations via natural‑language instructions.

## 🏗️ Project Structure

### Directory Architecture
```
nomad-arc/
├── 📁 .roo/                    # Roo configuration rules
│   ├── rules/                 # Development standards
│   └── rules-code/            # Code rules
├── 📁 plans/                   # Project planning documents
│   ├── environment-config.md  # Environment configuration
│   ├── architecture.md        # Architecture design
│   └── bounty-requirements.md # Bounty requirements
├── 📁 src/                     # Source code
│   ├── 📁 app/                # Next.js App Router (Presentation Layer)
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── 📁 api/            # API routes
│   │       └── intent/        # Intent processing API
│   ├── 📁 components/         # React components (UI Layer)
│   │   ├── ui/                # Basic UI components
│   │   ├── agent/             # AI agent components
│   │   └── wallet/            # Wallet connection components
│   ├── 📁 hooks/              # React Hooks
│   │   ├── use-intent.ts      # Intent processing Hook
│   │   ├── use-assets.ts      # Asset query Hook
│   │   └── use-transaction.ts # Transaction status Hook
│   ├── 📁 lib/                # Utility libraries (Logic Layer)
│   │   ├── ai/                # AI‑related utilities
│   │   │   ├── openai-client.ts
│   │   │   └── intent-parser.ts
│   │   ├── blockchain/        # Blockchain utilities
│   │   │   ├── providers.ts
│   │   │   └── transaction.ts
│   │   └── utils/             # General utilities
│   │       ├── format.ts
│   │       └── validation.ts
│   ├── 📁 skills/             # Atomic skill modules (Execution Layer)
│   │   ├── ens-skill.ts       # ENS domain resolution skill
│   │   ├── lifi-skill.ts      # LI.FI cross‑chain routing skill
│   │   ├── circle-skill.ts    # Circle Arc settlement skill
│   │   └── uniswap-skill.ts   # Uniswap v4 trading skill
│   ├── 📁 types/              # TypeScript type definitions
│   │   ├── intent.ts          # Intent type definitions
│   │   ├── blockchain.ts      # Blockchain types
│   │   └── agent.ts           # Agent types
│   └── 📁 constants/          # Constant configurations
│       ├── addresses.ts       # Contract address book
│       ├── chains.ts          # Chain configurations
│       └── abis.ts            # Contract ABIs
├── 📁 scripts/                # Terminal test scripts
│   ├── test-intent.ts         # Intent parsing test
│   ├── test-bridge.ts         # Cross‑chain bridge test
│   └── test-swap.ts           # Swap test
├── 📁 tests/                  # Test files
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End‑to‑end tests
├── 📁 public/                 # Static assets
├── .env.local                 # Environment variables (not committed)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── README.md                  # Project description
└── task-tracking.md           # Task tracking
```

## 🛠️ Tech Stack

### Frontend Framework
- **Next.js 14** - React framework, App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **React 18** - UI library

### Blockchain Interaction
- **Viem** - Ethereum TypeScript interface
- **Wagmi** - React Hooks for Web3
- **ConnectKit** - Wallet connection UI

### Sponsor SDKs
- **@uniswap/v4-sdk** - Uniswap v4 interaction
- **@lifi/sdk** - LI.FI cross‑chain routing
- **@circle-fin/arc-sdk** - Circle Arc cross‑chain settlement
- **ensjs** - ENS domain resolution

### AI Integration
- **OpenAI GPT‑4o** - Intent parsing
- **LangChain.js** (optional) - AI workflow orchestration

### Development Tools
- **Jest** - Testing framework
- **@testing-library/react** - React testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint‑staged** - Pre‑commit checks

### Deployment & Monitoring
- **Vercel** - Deployment platform
- **Sentry** - Error monitoring
- **Vercel Analytics** - User analytics

## 📦 Dependency Installation Commands

```bash
# Core dependencies
npm install next@14 react@18 react-dom@18 typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer

# Blockchain dependencies
npm install viem wagmi @wagmi/core @wagmi/connectors @rainbow-me/rainbowkit

# Sponsor SDKs
npm install @uniswap/v4-sdk @lifi/sdk @circle-fin/arc-sdk ensjs

# AI dependencies
npm install openai

# Development tools
npm install -D jest @testing-library/react @testing-library/jest-dom eslint prettier eslint-config-next husky lint-staged
```

## 🎯 Architecture Principles

### 1. Three‑Layer Architecture
- **Presentation Layer** (`src/app/`, `src/components/`) – User interface
- **Logic Layer** (`src/lib/ai/`, `src/skills/`) – AI decision‑making & business logic
- **Execution Layer** (`src/lib/blockchain/`, `scripts/`) – On‑chain interactions

### 2. Skill Modularity
- Each sponsor technology is encapsulated as an independent skill
- Skills communicate via standard interfaces
- Supports hot‑plugging and independent testing

### 3. Type‑Safety First
- All functions and components have TypeScript types
- Avoid using `any` type
- Strict compilation checks

### 4. Terminal‑First Development
- Test on‑chain logic first in `scripts/`
- Integrate into UI after validation
- Ensure core functionality stability

## 🔧 Environment Configuration

### `.env.local` Template
```env
# OpenAI
OPENAI_API_KEY=sk-...

# Blockchain RPC
NEXT_PUBLIC_ALCHEMY_API_KEY=...
NEXT_PUBLIC_INFURA_API_KEY=...

# Wallet Connection
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...

# Chain Configurations
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
```

## 🚀 Development Workflow

### Phase 1: Infrastructure (1‑2 days)
1. Project initialization & dependency installation
2. Environment variable configuration
3. Code quality tool setup

### Phase 2: Skill Development (3‑4 days)
1. ENS Skill – domain resolution
2. LI.FI Skill – cross‑chain routing
3. Circle Skill – USDC cross‑chain
4. Uniswap Skill – Swap interaction

### Phase 3: Intent Engine (2‑3 days)
1. OpenAI intent parser
2. Workflow scheduler
3. Terminal end‑to‑end testing

### Phase 4: UI/UX Delivery (2‑3 days)
1. AI interaction interface
2. Asset dashboard
3. Deployment & demonstration

## 📊 Quality Assurance

### Testing Strategy
- **Unit Testing**: each skill tested independently
- **Integration Testing**: skill combination testing
- **End‑to‑End Testing**: full intent execution flow

### Code Standards
- Follow `.roo/rules-code/rules.md` standards
- All on‑chain interactions include try‑catch
- BigInt handled with `formatUnits`/`parseUnits`

### Security Requirements
- No hard‑coded private keys or API keys
- Environment variables stored encrypted
- User confirmation before transaction signing

## 🏆 Bounty Requirements Mapping

| Sponsor | Corresponding Module | Verification Method |
|--------|---------------------|---------------------|
| Uniswap v4 | `src/skills/uniswap-skill.ts` | Arbitrum Sepolia transaction hash |
| Circle Arc | `src/skills/circle-skill.ts` | USDC cross‑chain transaction record |
| LI.FI | `src/skills/lifi-skill.ts` | Cross‑chain routing quote & execution |
| ENS | `src/skills/ens-skill.ts` | Domain resolution demo |

---

**Last Updated**: 2026‑02‑05  
**Version**: 1.0.0  
**Status**: Development Ready