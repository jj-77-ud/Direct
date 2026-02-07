# ⚠️ Circle & Uniswap Configuration Document Has Been Migrated

**Note**: This file has been migrated to the new skill configuration system. Please use the new configuration documents:

## New Configuration Locations
- **Circle CCTP Configuration**: `docs/skill-configs/circle-config.md`
- **Uniswap v4 Configuration**: `docs/skill-configs/uniswap-config.md`
- **Configuration System Overview**: `docs/skill-configs/README.md`

### Quick Links
- [Circle CCTP Skill Configuration Guide](../docs/skill-configs/circle-config.md)
- [Uniswap v4 Skill Configuration Guide](../docs/skill-configs/uniswap-config.md)
- [View All Configuration Documents](../docs/skill-configs/)

---

## Old Configuration Content (For Reference Only)

The following is the configuration content before migration. It is recommended to refer to the new configuration documents for the latest information.

### Uniswap v4 Configuration
```javascript
// Configuration for Arbitrum Sepolia testnet
export const UNISWAP_V4_CONFIG = {
  chainId: 421614, // Arbitrum Sepolia
  poolManager: "0x6736678280587003019D123eBE3974bb21d60768",
  // Note: v4 operations typically require reading state through the StateView contract
};
```

```javascript
import { ethers } from 'ethers';
import { PoolManager } from '@uniswap/v4-sdk'; // Assuming standard type package is used

const provider = new ethers.JsonRpcProvider("YOUR_ARBITRUM_SEPOLIA_RPC");

// Initialize PoolManager instance
const poolManagerContract = new ethers.Contract(
  UNISWAP_V4_CONFIG.poolManager,
  POOL_MANAGER_ABI, // Need to import v4 PoolManager ABI
  provider
);
```

### Circle CCTP Configuration
```javascript
// Common for Arbitrum Sepolia and Base Sepolia
export const CIRCLE_CCTP_CONFIG = {
  // Message Transmitter: Responsible for receiving and sending cross-chain messages
  messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  
  // Token Messenger: Responsible for burning and minting USDC
  tokenMessenger: "0xb43db544E2c27092c107639Ad201b3dEfAbcF192",

  // Target Chain Domain ID Reference (Sepolia testnet)
  domains: {
    arbitrum: 3,
    base: 6,
    ethereum: 0
  }
};
```

```javascript
// Example: Cross-chain transfer pre-configuration
const cctpSdkConfiguration = {
  source: {
    tokenMessenger: CIRCLE_CCTP_CONFIG.tokenMessenger,
    messageTransmitter: CIRCLE_CCTP_CONFIG.messageTransmitter,
  },
  // If attestation monitoring is needed, typically need to configure Circle's API endpoint
  irisApi: "https://iris-api-sandbox.circle.com" 
};
```

---

## Migration Instructions

### Content Included in New Configuration Documents

#### Circle CCTP Configuration (`docs/skill-configs/circle-config.md`)
1. **Environment Variable Configuration** (private keys, API keys, RPC nodes)
2. **Code Configuration Examples** (contract addresses, supported chain lists)
3. **Bridge Kit Configuration** (official SDK integration)
4. **Chain ID Mapping** (project chain IDs to Bridge Kit identifiers)
5. **Configuration Validation Scripts**
6. **Troubleshooting Guides**
7. **Best Practices**

#### Uniswap v4 Configuration (`docs/skill-configs/uniswap-config.md`)
1. **Environment Variable Configuration** (private keys, RPC nodes, token addresses)
2. **Code Configuration Examples** (PoolManager address, default tokens)
3. **SDK Initialization** (Uniswap v4 SDK and SDK Core)
4. **Transaction Configuration** (slippage, gas limits, price impact thresholds)
5. **Pool State Queries** (StateView contract usage)
6. **Configuration Validation Scripts**
7. **Troubleshooting Guides**
8. **Best Practices**

### Major Improvements
1. **Unified Structure**: Each skill has independent configuration documents
2. **Complete Documentation**: Detailed explanations of all configuration options
3. **Security Enhancements**: Sensitive information managed through environment variables
4. **Validation Tools**: Configuration validation scripts provided
5. **Best Practices**: Recommendations for configuration and usage

### Immediate Actions
1. **Circle CCTP**:
   - View new document: `docs/skill-configs/circle-config.md`
   - Run validation: `npm run validate-config -- --skill=circle`
   - Test functionality: `npx tsx scripts/test-circle-skill.ts`

2. **Uniswap v4**:
   - View new document: `docs/skill-configs/uniswap-config.md`
   - Run validation: `npm run validate-config -- --skill=uniswap`
   - Test functionality: `npx tsx scripts/test-uniswap-skill.ts`

---

## Related Skill Files

### Circle CCTP
- `src/skills/circle-skill.ts` - Circle CCTP skill implementation
- `src/constants/addresses.ts` - Contract address definitions
- `scripts/test-circle-skill.ts` - Skill test script
- `scripts/real-circle-test.ts` - Real environment test

### Uniswap v4
- `src/skills/uniswap-skill.ts` - Uniswap v4 skill implementation
- `src/lib/uniswap/state-view.ts` - Pool state query tool
- `src/lib/uniswap/transaction-builder.ts` - Transaction building tool
- `scripts/test-uniswap-skill.ts` - Skill test script
- `scripts/test-uniswap-real.ts` - Real environment test

---

**Last Updated**: 2026-02-04  
**Status**: Migrated to new system  
**Maintainer**: Direct team  
**Version**: Migration completed