# ENS Skill Configuration Guide

## Overview

The ENS skill encapsulates ENS (Ethereum Name Service) domain resolution logic, supporting forward resolution (domain -> address) and reverse resolution (address -> domain).

**Bonus Requirement**: UI must include bidirectional resolution logic for `.eth` domains.

**Tech Stack**: Use official `@ensdomains/ensjs` for ENS domain resolution.

## Configuration Hierarchy

### 1. Environment Variables Configuration (Highest Priority)

Configure the following environment variables in the `.env.local` file:

```bash
# ENS Configuration
ENS_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key  # Mainnet RPC (for ENS resolution)
ENS_TESTNET_RPC_URL=https://rpc.sepolia.org                   # Testnet RPC

# Cache Configuration
ENS_CACHE_TTL=300000  # Cache validity period (milliseconds), default 5 minutes
ENS_MAX_RETRIES=3     # Maximum retry count
```

### 2. Code Configuration

ENS configuration section in `config/project-config.ts`:

```typescript
export const ENS_CONFIG = {
  // Contract addresses
  ensRegistryAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // Mainnet ENS registry
  defaultResolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',     // Public resolver
  
  // Supported chain list
  supportedChains: [
    1,        // Ethereum Mainnet (primary)
    11155111, // Ethereum Sepolia
    42161,    // Arbitrum One
    421614,   // Arbitrum Sepolia
    8453,     // Base Mainnet
    84532,    // Base Sepolia
    10,       // Optimism
    137,      // Polygon
  ],
  
  // Cache configuration
  cacheTtl: process.env.ENS_CACHE_TTL ? parseInt(process.env.ENS_CACHE_TTL) : 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 1000, // Maximum cache entries
  
  // Retry configuration
  maxRetries: process.env.ENS_MAX_RETRIES ? parseInt(process.env.ENS_MAX_RETRIES) : 3,
  retryDelay: 1000,   // 1-second retry delay
  
  // Timeout configuration
  requestTimeout: 10000, // 10-second request timeout
  
  // Debug configuration
  debugMode: process.env.NODE_ENV === 'development',
  
  // ENSjs configuration
  ensjsConfig: {
    useRealSDK: true,            // Use real ENSjs SDK
    enableCcipRead: true,        // Enable CCIP-Read (supports cross-chain resolution)
    graphUri: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens', // ENS subgraph
  },
}
```

### 3. Skill Internal Configuration

Default configuration in `src/skills/ens-skill.ts`:

```typescript
export interface EnsSkillConfig {
  // ENS registry address (may differ by chain)
  ensRegistryAddress?: Address
  
  // Resolver configuration
  defaultResolver?: Address
  
  // Cache configuration
  cacheTtl?: number // Cache validity period (milliseconds)
  
  // Retry configuration
  maxRetries?: number
  retryDelay?: number
}
```

## Detailed Configuration Instructions

### Contract Address Management

ENS core contract addresses:

```typescript
// Mainnet ENS contract addresses
export const ENS_MAINNET_ADDRESSES = {
  registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address,
  publicResolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41' as Address,
  reverseRegistrar: '0x084b1c3c81545d370f3634392de611caabff8148' as Address,
  universalResolver: '0xce01f8eee7E479C928F8919abD53E553a36CeF67' as Address,
}

// Testnet ENS contract addresses (Sepolia)
export const ENS_SEPOLIA_ADDRESSES = {
  registry: '0x...' as Address, // Sepolia ENS registry
  publicResolver: '0x...' as Address,
}
```

### ENSjs Initialization

ENSjs SDK needs proper initialization:

```typescript
import { ENS } from '@ensdomains/ensjs'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

// Initialize ENSjs
const initializeENS = (chainId: number) => {
  const client = createPublicClient({
    chain: mainnet, // ENS primarily on Ethereum mainnet
    transport: http(process.env.ENS_RPC_URL),
  })
  
  const ens = new ENS({
    provider: client,
    graphUri: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
  })
  
  return ens
}
```

### Multi-chain Support Configuration

ENS supports multi-chain resolution, requires chain mapping configuration:

```typescript
// Chain ID to ENS contract address mapping
export const ENS_CHAIN_CONFIGS: Record<number, { registry: Address; resolver: Address }> = {
  1: { // Ethereum Mainnet
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
  },
  11155111: { // Sepolia
    registry: '0x...',
    resolver: '0x...',
  },
  42161: { // Arbitrum One
    registry: '0x...', // If deployed
    resolver: '0x...',
  },
}

// Get chain-specific ENS configuration
export const getEnsConfigForChain = (chainId: number) => {
  const config = ENS_CHAIN_CONFIGS[chainId]
  if (!config) {
    // Default fallback to mainnet configuration (via cross-chain messages)
    return ENS_CHAIN_CONFIGS[1]
  }
  return config
}
```

## Configuration Validation

### Validation Scripts

Run the following scripts to validate ENS configuration:

```bash
# Validate ENS configuration
npm run validate-config -- --skill=ens

# Or run test script directly
npx tsx scripts/test-ens-integrated.ts
```

### Validation Steps

1. **Contract Address Check**:
   ```bash
   npx tsx scripts/check-ens-contracts.ts
   ```

2. **ENSjs Initialization Test**:
   ```bash
   npx tsx scripts/test-ens-sdk.ts
   ```

3. **Domain Resolution Test**:
   ```bash
   npx tsx scripts/test-ens-integrated.ts --test=resolve --domain=vitalik.eth
   ```

4. **Reverse Resolution Test**:
   ```bash
   npx tsx scripts/test-ens-integrated.ts --test=reverse --address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
   ```

## Troubleshooting

### Common Issues

#### 1. RPC Node Connection Failure
**Symptoms**: `Failed to connect to RPC` error
**Solutions**:
- Check if RPC URL is correct
- Confirm RPC node supports ENS queries
- Try using alternative RPC nodes

#### 2. Domain Resolution Failure
**Symptoms**: `Failed to resolve domain` error
**Solutions**:
- Check if domain format is correct (ends with .eth)
- Confirm domain is registered
- Verify resolver configuration

#### 3. Cross-chain Resolution Failure
**Symptoms**: `Cross-chain resolution failed` error
**Solutions**:
- Check if CCIP-Read is enabled
- Confirm target chain supports ENS
- Verify cross-chain message configuration

### Debug Mode

Enable debug mode to get detailed logs:

```typescript
// Enable debugging in code
const ensSkill = new EnsSkill({
  debugMode: true,
  ensRegistryAddress: ENS_MAINNET_ADDRESSES.registry,
});

// Or set in environment variables
DEBUG_ENS=true npm run dev
```

## Best Practices

### 1. Cache Strategy
- Set reasonable cache validity period (5-30 minutes)
- Implement LRU cache to prevent memory leaks
- Use longer cache for frequently queried domains

### 2. Error Handling
- Implement graceful degradation (e.g., use subgraph when RPC fails)
- Provide user-friendly error messages
- Record detailed error logs for analysis

### 3. Performance Optimization
- Use batch queries to reduce RPC calls
- Implement request deduplication
- Use CDN caching for static resources

### 4. Security
- Validate domain input to prevent injection attacks
- Implement rate limiting to prevent abuse
- Use HTTPS for sensitive data transmission

## Configuration Examples

### Development Environment Configuration
```typescript
// config/development.ts
export const ENS_CONFIG_DEV = {
  // Use testnet configuration
  ensRegistryAddress: ENS_SEPOLIA_ADDRESSES.registry,
  
  // Lenient configuration
  cacheTtl: 60 * 1000, // 1-minute cache
  maxRetries: 5,
  
  // Debug configuration
  debugMode: true,
  requestTimeout: 30000, // 30-second timeout
}
```

### Production Environment Configuration
```typescript
// config/production.ts
export const ENS_CONFIG_PROD = {
  // Use mainnet configuration
  ensRegistryAddress: ENS_MAINNET_ADDRESSES.registry,
  
  // Production optimized configuration
  cacheTtl: 10 * 60 * 1000, // 10-minute cache
  maxRetries: 3,
  
  // Production configuration
  debugMode: false,
  requestTimeout: 10000, // 10-second timeout
  
  // High availability configuration
  fallbackRpcUrls: [
    'https://eth-mainnet.g.alchemy.com/v2/key1',
    'https://eth-mainnet.g.alchemy.com/v2/key2',
  ],
}
```

## Resolution Process Description

### 1. Forward Resolution (Domain -> Address)
1. Validate domain format
2. Check cache for results
3. Query resolver through ENS registry
4. Query address record through resolver
5. Handle CCIP-Read (if needed)
6. Return resolution result and update cache

### 2. Reverse Resolution (Address -> Domain)
1. Validate address format
2. Check cache for results
3. Query domain through reverse registry
4. Verify validity of reverse record
5. Return domain and update cache

### 3. Domain Availability Check
1. Validate domain format
2. Query registration status
3. Check expiration time
4. Return availability status

## Related Resources

- [ENS Official Documentation](https://docs.ens.domains/)
- [ENSjs GitHub](https://github.com/ensdomains/ensjs)
- [ENS Contract Addresses](https://docs.ens.domains/contract-api-reference/deployments)
- [ENS Subgraph](https://thegraph.com/explorer/subgraphs/ensdomains/ens)

---

**Last Updated**: 2026-02-04  
**Version**: 1.0.0  
**Maintainer**: Nomad Arc Team  
**Related Files**: 
- `src/skills/ens-skill.ts`
- `src/lib/ens.ts`
- `src/constants/addresses.ts`
- `config/project-config.ts`
- `scripts/test-ens-integrated.ts`
- `scripts/test-ens-sdk.ts`