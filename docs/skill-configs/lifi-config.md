# LI.FI Skill Configuration Guide

## Overview

The LI.FI skill encapsulates LI.FI SDK's cross-chain bridging logic, supporting multi-chain, multi-token cross-chain transfers, and providing optimal path selection functionality.

**Bonus Requirement**: Must demonstrate how AI Agent makes path decisions based on quotes.

## Configuration Hierarchy

### 1. Environment Variables Configuration (Highest Priority)

Configure the following environment variables in the `.env.local` file:

```bash
# LI.FI API Configuration
LIFI_API_KEY=your_api_key_here
LIFI_INTEGRATOR=Nomad_Arc

# RPC Node Configuration (optional, overrides default configuration)
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
BASE_RPC_URL=https://sepolia.base.org
ETHEREUM_RPC_URL=https://rpc.sepolia.org
```

### 2. Code Configuration

LI.FI configuration section in `config/project-config.ts`:

```typescript
export const LIFI_CONFIG = {
  // API Configuration
  apiKey: process.env.LIFI_API_KEY || '',
  integrator: process.env.LIFI_INTEGRATOR || 'Nomad_Arc',
  
  // Default route preferences
  defaultSlippage: 0.005,        // 0.5% default slippage
  defaultGasLimit: '3000000',    // Default gas limit
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000,              // 1-second retry delay
  
  // Supported chain list
  supportedChains: [
    421614,  // Arbitrum Sepolia
    84532,   // Base Sepolia
    11155111, // Ethereum Sepolia
    1,       // Ethereum Mainnet
    42161,   // Arbitrum One
    10,      // Optimism
    56,      // BSC
  ],
  
  // Debug configuration
  debugMode: process.env.NODE_ENV === 'development',
}
```

### 3. Skill Internal Configuration

Default configuration in `src/skills/lifi-skill.ts`:

```typescript
export interface LiFiSkillConfig {
  // LI.FI API Configuration
  apiKey?: string               // LI.FI API key
  baseUrl?: string              // API base URL
  
  // Executor configuration
  executorAddress?: Address     // LiFi Diamond contract address
  
  // Cross-chain configuration
  defaultSlippage?: number      // Default slippage tolerance (percentage)
  defaultGasLimit?: string      // Default gas limit
  
  // Retry configuration
  maxRetries?: number
  retryDelay?: number
  
  // Debug configuration
  debugMode?: boolean
}
```

## Detailed Configuration Instructions

### API Key Management

**Security Warning**: API keys must be managed through environment variables,严禁 hardcoding in code.

1. **Obtaining API Key**:
   - Visit [LI.FI Developer Portal](https://li.fi/developers)
   - Register account and create application
   - Obtain dedicated API key

2. **Environment Variable Setup**:
   ```bash
   # .env.local
   LIFI_API_KEY=01324a3d-4773-4746-b0c7-a58c257478e9.f744cb62-ae84-4985-a685-58c4e85ed6d2
   LIFI_INTEGRATOR=Nomad_Arc
   ```

### RPC Node Configuration

LI.FI SDK supports custom RPC node configuration to prevent public node failures:

```typescript
// Configuration example in src/lib/lifi.ts
import { createConfig, ChainId } from "@lifi/sdk";

export const initLifiSDK = () => {
  createConfig({
    integrator: "Nomad_Arc",
    apiKey: process.env.LIFI_API_KEY,
    
    // Custom RPC node configuration
    rpcUrls: {
      [ChainId.ETH]: [process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/"],
      [ChainId.ARB]: [process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"],
      [ChainId.OP]: ["https://mainnet.optimism.io"],
      [ChainId.BSC]: ["https://bsc-dataseed.binance.org/"],
    },
    
    // Global route preferences
    routeOptions: {
      slippage: 0.005,        // Default slippage 0.5%
      allowSwitchChain: true, // Allow automatic network switching during transactions
    },
    
    // Automatically preload chain data
    preloadChains: true,
  });
}
```

### Contract Address Configuration

LI.FI executor contract addresses are read from `src/constants/addresses.ts`:

```typescript
// src/constants/addresses.ts
export const getLiFiExecutorAddress = (chainId: number): Address => {
  switch (chainId) {
    case 421614: // Arbitrum Sepolia
      return '0x...' as Address;
    case 84532: // Base Sepolia
      return '0x...' as Address;
    default:
      throw new Error(`Unsupported chain for LiFi: ${chainId}`);
  }
}
```

## Configuration Validation

### Validation Scripts

Run the following scripts to validate LI.FI configuration:

```bash
# Validate LI.FI configuration
npm run validate-config -- --skill=lifi

# Or run test script directly
npx tsx scripts/test-lifi-skill.ts
```

### Validation Steps

1. **Environment Variable Check**:
   ```bash
   node -e "console.log('LIFI_API_KEY:', process.env.LIFI_API_KEY ? '✓ Set' : '✗ Missing')"
   ```

2. **API Connection Test**:
   ```bash
   npx tsx scripts/test-lifi-config.js
   ```

3. **Skill Initialization Test**:
   ```bash
   npx tsx scripts/test-lifi-skill.ts --test=init
   ```

## Troubleshooting

### Common Issues

#### 1. Invalid API Key
**Symptoms**: `401 Unauthorized` error
**Solutions**:
- Check if API key is correct
- Confirm if key has access permissions
- Verify if environment variables are loaded

#### 2. RPC Node Connection Failure
**Symptoms**: `Failed to fetch routes` error
**Solutions**:
- Check if RPC URL is correct
- Try using alternative RPC nodes
- Increase request timeout

#### 3. Chain Not Supported
**Symptoms**: `Unsupported chain` error
**Solutions**:
- Confirm chain ID is in `supportedChains` list
- Update chain configuration in `src/constants/chains.ts`

### Debug Mode

Enable debug mode to get detailed logs:

```typescript
// Enable debugging in code
const lifiSkill = new LiFiSkill({
  debugMode: true,
  apiKey: process.env.LIFI_API_KEY,
});

// Or set in environment variables
DEBUG_LIFI=true npm run dev
```

## Best Practices

### 1. Rate Limit Management
- LI.FI API has rate limits, design request frequency reasonably
- Use caching to reduce duplicate requests
- Implement exponential backoff retry mechanism

### 2. Path Optimization
- Configure multiple bridge options
- Set reasonable slippage tolerance
- Consider gas costs and execution time

### 3. Error Handling
- Implement complete error handling chain
- Provide user-friendly error messages
- Record detailed error logs

### 4. Monitoring and Alerting
- Monitor cross-chain transaction success rate
- Set API error alerts
- Track gas cost changes

## Configuration Examples

### Development Environment Configuration
```typescript
// config/development.ts
export const LIFI_CONFIG_DEV = {
  apiKey: process.env.LIFI_API_KEY_DEV,
  integrator: 'Nomad_Arc_Dev',
  defaultSlippage: 0.01, // 1% higher slippage tolerance
  debugMode: true,
}
```

### Production Environment Configuration
```typescript
// config/production.ts
export const LIFI_CONFIG_PROD = {
  apiKey: process.env.LIFI_API_KEY_PROD,
  integrator: 'Nomad_Arc_Prod',
  defaultSlippage: 0.005, // 0.5% standard slippage
  debugMode: false,
  maxRetries: 5,
}
```

## Related Resources

- [LI.FI Official Documentation](https://docs.li.fi/)
- [LI.FI SDK GitHub](https://github.com/lifinance/sdk)
- [Cross-chain Bridging Best Practices](https://docs.li.fi/best-practices)
- [API Reference Documentation](https://docs.li.fi/reference/api-reference)

---

**Last Updated**: 2026-02-04  
**Version**: 1.0.0  
**Maintainer**: Nomad Arc Team  
**Related Files**: 
- `src/skills/lifi-skill.ts`
- `src/lib/lifi.ts`
- `config/project-config.ts`
- `scripts/test-lifi-skill.ts`