# Direct Skill Configuration System

## Overview

This document is the skill configuration hub for the Nomad Arc project, adopting a skill-specific configuration documentation architecture. Each skill has independent configuration documentation, ensuring clarity, maintainability, and security of configurations.

## Configuration Document Index

| Skill | Configuration Document | Description | Last Updated |
|------|----------|------|----------|
| **LI.FI** | [lifi-config.md](./lifi-config.md) | LI.FI cross-chain bridging skill configuration | 2026-02-04 |
| **Circle CCTP** | [circle-config.md](./circle-config.md) | Circle CCTP USDC cross-chain skill configuration | 2026-02-04 |
| **Uniswap v4** | [uniswap-config.md](./uniswap-config.md) | Uniswap v4 trading and liquidity skill configuration | 2026-02-04 |
| **ENS** | [ens-config.md](./ens-config.md) | ENS domain resolution skill configuration | 2026-02-04 |
| **AI System** | [ai-config.md](./ai-config.md) | AI intent parsing system configuration | 2026-02-04 |

## Configuration Hierarchy Architecture

```
Environment Variables (.env.local)        # Highest priority, contains sensitive information
  ↓
Project Configuration (config/project-config.ts) # Runtime configuration
  ↓
Skill Default Configuration (inside skill)      # Default values and fallback configuration
  ↓
Configuration Documentation (docs/skill-configs/) # Documentation and best practices
```

## Quick Start

### 1. Environment Configuration
```bash
# Copy environment variable template
cp .env.example .env.local

# Edit .env.local file, fill in your configuration
```

### 2. Configuration Validation
```bash
# Run configuration validation script
npm run validate-config
```

### 3. Skill Configuration
1. Check the corresponding skill's configuration document
2. Configure environment variables according to the documentation
3. Run skill test scripts to verify configuration

## Configuration Best Practices

### Security First
- **Sensitive information** (API keys, private keys) must be managed through environment variables
- Use `.env.example` as template, `.env.local` to store actual values
- Configuration files should not contain real keys, only placeholders

### Single Source of Truth
- Each configuration item is defined in only one place
- Avoid duplicating the same configuration in documentation and code
- Use code as the primary configuration source, documentation as explanation

### Version Control
- Configuration changes should have clear version history
- Major configuration changes require updating `CHANGELOG.md`
- Configuration templates should be synchronized with code versions

## Environment Variable Naming Convention

To ensure consistency and maintainability of environment variable naming, all skill configurations must follow the following naming convention:

### General Rules
- Prefix format: `[SKILL_NAME]_[FUNCTION]_[SPECIFIC_ITEM]`
- Skill names: AI, CIRCLE, ENS, LIFI, UNISWAP (uppercase)
- Function categories: API, RPC, PRIVATE_KEY, DEBUG, CACHE, CONFIG
- Specific items: Describe specific content

### Specific Specifications
1. **API Configuration**: `[SKILL]_API_KEY`, `[SKILL]_API_URL`, `[SKILL]_INTEGRATOR`
2. **RPC Configuration**: `[CHAIN]_RPC_URL` (e.g., `ARBITRUM_SEPOLIA_RPC_URL`)
3. **Private Keys**: `[SKILL]_PRIVATE_KEY`
4. **Debugging**: `DEBUG_[SKILL]`
5. **Caching**: `[SKILL]_CACHE_TTL`, `[SKILL]_CACHE_ENABLED`
6. **Others**: `[SKILL]_MAX_RETRIES`, `[SKILL]_TIMEOUT`, `[SKILL]_SLIPPAGE`

### Examples
```bash
# AI System
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

## Troubleshooting

### Common Issues
1. **Configuration not taking effect**: Check if environment variables are loaded correctly
2. **API key errors**: Verify key format and permissions
3. **Contract address errors**: Confirm chain ID and network match

### Debugging Tools
```bash
# View current configuration status
npm run debug-config

# Validate specific skill configuration
npm run validate-config -- --skill=lifi
```

## Contribution Guidelines

### Adding New Skill Configuration
1. Create new configuration document in `docs/skill-configs/` directory
2. Follow unified documentation template
3. Update index table in this README
4. Update file registry in `AI_MANIFEST.md`

### Updating Existing Configuration
1. Modify corresponding skill configuration document
2. If needed, update `config/project-config.ts`
3. Update version number and last updated date
4. Add change record in `CHANGELOG.md`

## Related Resources

- [Project Main Configuration](../config/project-config.ts) - Runtime configuration
- [Environment Variable Template](../.env.example) - Environment variable template
- [AI_MANIFEST.md](../AI_MANIFEST.md) - Project file index
- [Configuration Validation Script](../scripts/validate-config.ts) - Configuration validation tool

---

**Last Updated**: 2026-02-04  
**Maintainer**: Nomad Arc Team  
**Version**: 1.0.0