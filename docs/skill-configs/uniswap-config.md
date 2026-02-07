# Uniswap v4 Skill Configuration Guide

## Overview

The Uniswap skill encapsulates Uniswap v4 trading and liquidity management logic, supporting token swaps, add/remove liquidity operations.

**Bounty Requirement**: Must demonstrate interaction with PoolManager on Arbitrum Sepolia.

**Tech Stack**: Uses official `@uniswap/v4-sdk` and `@uniswap/sdk-core` for real integration.

## Configuration Hierarchy

### 1. Environment Variables Configuration (Highest Priority)

Configure the following environment variables in `.env.local`:

```bash
# Uniswap v4 Configuration
UNISWAP_PRIVATE_KEY=0x...  # Private key for testing (production should get from wallet)

# RPC Node Configuration
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHEREUM_SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Token Addresses (Optional, usually read from addresses.ts)
USDC_ADDRESS=0x...
WETH_ADDRESS=0x...
```

### 2. Code Configuration

Uniswap configuration section in `config/project-config.ts`:

```typescript
export const UNISWAP_CONFIG = {
  // Contract addresses (read from addresses.ts)
  poolManagerAddress: getUniswapV4PoolManagerAddress(),
  
  // Default token addresses
  defaultTokens: {
    usdc: getUSDCAddress(),
    weth: getWETHAddress(),
  },
  
  // Transaction configuration
  defaultSlippage: 0.005,        // 0.5% default slippage
  defaultGasLimit: '3000000',    // Default gas limit
  defaultDeadline: 20 * 60,      // 20 minutes default deadline
  
  // Price impact threshold
  maxPriceImpact: 0.05,          // 5% maximum price impact
  
  // Supported chains list
  supportedChains: [
    421614,  // Arbitrum Sepolia (main testnet)
    84532,   // Base Sepolia
    11155111, // Ethereum Sepolia
    1,       // Ethereum Mainnet
    42161,   // Arbitrum One
    8453,    // Base Mainnet
  ],
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000,              // 1 second retry delay
  
  // Debug configuration
  debugMode: process.env.NODE_ENV === 'development',
  
  // SDK configuration
  sdkConfig: {
    useRealSDK: true,            // Use real SDK
    enableHooks: false,          // Whether to enable Hooks (v4 feature)
  },
}
```

### 3. Skill Internal Configuration

Default configuration in `src/skills/uniswap-skill.ts`:

```typescript
export interface UniswapSkillConfig {
  // Uniswap v4 contract address
  poolManagerAddress?: Address   // PoolManager contract address
  
  // Transaction configuration
  defaultSlippage?: number       // Default slippage tolerance (percentage)
  defaultGasLimit?: string       // Default gas limit
  defaultDeadline?: number       // Default transaction deadline (seconds)
  defaultRecipient?: Address     // Default recipient address
  
  // Retry configuration
  maxRetries?: number
  retryDelay?: number
  
  // Debug configuration
  debugMode?: boolean
}
```

## Detailed Configuration Explanation

### Contract Address Management

Uniswap v4 core contract addresses are read from `src/constants/addresses.ts`:

```typescript
// src/constants/addresses.ts
export const getUniswapV4PoolManagerAddress = (chainId: number): Address => {
  switch (chainId) {
    case 421614: // Arbitrum Sepolia
      return '0x6736678280587003019D123eBE3974bb21d60768' as Address
    case 84532: // Base Sepolia
      return '0x...' as Address // Base Sepolia address
    default:
      throw new Error(`Unsupported chain for Uniswap v4: ${chainId}`)
  }
}

// Common token addresses
export const getUSDCAddress = (chainId: number): Address => {
  switch (chainId) {
    case 421614: // Arbitrum Sepolia
      return '0x...' as Address
    case 84532: // Base Sepolia
      return '0x...' as Address
    default:
      throw new Error(`Unsupported chain for USDC: ${chainId}`)
  }
}

export const getWETHAddress = (chainId: number): Address => {
  switch (chainId) {
    case 421614: // Arbitrum Sepolia
      return '0x...' as Address
    case 84532: // Base Sepolia
      return '0x...' as Address
    default:
      throw new Error(`Unsupported chain for WETH: ${chainId}`)
  }
}
```

### SDK Initialization

Uniswap v4 SDK needs proper initialization:

```typescript
import * as UniswapV4SDK from '@uniswap/v4-sdk'
import * as UniswapSDKCore from '@uniswap/sdk-core'
import { parseUnits, formatUnits } from 'viem'

// Initialize SDK
const initializeUniswapSDK = (chainId: number) => {
  // Create token objects
  const USDC = new UniswapSDKCore.Token(
    chainId,
    getUSDCAddress(chainId),
    6, // USDC decimals
    'USDC',
    'USD Coin'
  )
  
  const WETH = new UniswapSDKCore.Token(
    chainId,
    getWETHAddress(chainId),
    18, // WETH decimals
    'WETH',
    'Wrapped Ether'
  )
  
  return { USDC, WETH }
}
```

### Pool State Query

Use StateView contract to query pool state:

```typescript
import { getPoolState, calculatePriceFromSqrtPriceX96 } from '@/lib/uniswap/state-view'

// Query pool state
const poolState = await getPoolState({
  poolManagerAddress: config.poolManagerAddress,
  token0: USDC.address,
  token1: WETH.address,
  fee: 3000, // 0.3% fee
  chainId,
})
```

## Configuration Validation

### Validation Scripts

Run the following scripts to validate Uniswap configuration:

```bash
# Validate Uniswap configuration
npm run validate-config -- --skill=uniswap

# Or run test script directly
npx tsx scripts/test-uniswap-skill.ts
```

### Validation Steps

1. **Contract Address Check**:
   ```bash
   npx tsx scripts/check-uniswap-abi.ts
   ```

2. **SDK Initialization Test**:
   ```bash
   npx tsx scripts/test-uniswap-sdk.ts
   ```

3. **Pool State Query Test**:
   ```bash
   npx tsx scripts/test-uniswap-real.ts --test=pool-state
   ```

4. **Swap Function Test**:
   ```bash
   npx tsx scripts/test-swap.ts --test=simple
   ```

## Troubleshooting

### Common Issues

#### 1. PoolManager Address Error
**Symptoms**: `Invalid PoolManager address` error
**Solutions**:
- Check if chain ID is correct
- Verify contract address matches network
- Update addresses in `src/constants/addresses.ts`

#### 2. SDK Initialization Failure
**Symptoms**: `Failed to initialize Uniswap SDK` error
**Solutions**:
- Check `@uniswap/v4-sdk` and `@uniswap/sdk-core` versions
- Confirm token addresses and decimals are correct
- Verify RPC node connection

#### 3. Transaction Failure
**Symptoms**: `Transaction reverted` error
**Solutions**:
- Check if slippage settings are reasonable
- Confirm sufficient balance
- Verify token approval status

### Debug Mode

Enable debug mode for detailed logs:

```typescript
// Enable debugging in code
const uniswapSkill = new UniswapSkill({
  debugMode: true,
  poolManagerAddress: getUniswapV4PoolManagerAddress(421614),
});

// Or set via environment variable
DEBUG_UNISWAP=true npm run dev
```

## Best Practices

### 1. Slippage Management
- Adjust slippage based on market volatility
- Use more conservative slippage for large transactions
- Monitor price changes in real-time

### 2. Gas Optimization
- Monitor gas prices and choose appropriate time to execute transactions
- Use gas price prediction
- Implement batch transactions to reduce gas costs

### 3. Price Impact Control
- Set maximum price impact threshold (e.g., 5%)
- Split large transactions into smaller ones
- Monitor liquidity depth

### 4. Error Handling and Retry
- Implement complete error handling chain
- Implement exponential backoff retry for temporary errors
- Log detailed error logs for analysis

## Configuration Examples

### Development Environment Configuration
```typescript
// config/development.ts
export const UNISWAP_CONFIG_DEV = {
  // Testnet configuration
  poolManagerAddress: '0x6736678280587003019D123eBE3974bb21d60768',
  
  // Relaxed transaction configuration
  defaultSlippage: 0.01, // 1% higher slippage tolerance
  maxPriceImpact: 0.1,   // 10% maximum price impact
  
  // Debug configuration
  debugMode: true,
  maxRetries: 3,
}
```

### Production Environment Configuration
```typescript
// config/production.ts
export const UNISWAP_CONFIG_PROD = {
  // Mainnet configuration
  poolManagerAddress: getUniswapV4PoolManagerAddress(1),
  
  // Strict transaction configuration
  defaultSlippage: 0.005, // 0.5% standard slippage
  maxPriceImpact: 0.05,   // 5% maximum price impact
  
  // Production configuration
  debugMode: false,
  maxRetries: 5,
  retryDelay: 2000,
}
```

## Transaction Flow Explanation

### 1. Swap Flow
1. Query pool state and current price
2. Calculate price impact and slippage
3. Build swap transaction
4. Estimate gas cost
5. Send transaction and wait for confirmation
6. Verify transaction result

### 2. Liquidity Management Flow
1. Query pool information
2. Calculate liquidity ratio
3. Build add liquidity transaction
4. Send transaction and wait for confirmation
5. Receive liquidity tokens

### 3. Price Query Flow
1. Query pool state via StateView contract
2. Calculate sqrtPriceX96 to actual price
3. Consider fees and price impact
4. Return formatted price information

## Related Resources

- [Uniswap v4 Official Documentation](https://docs.uniswap.org/concepts/uniswap-v4)
- [v4 SDK GitHub](https://github.com/Uniswap/v4-sdk)
- [PoolManager Contract](https://github.com/Uniswap/v4-core)
- [StateView Contract](https://github.com/Uniswap/v4-periphery)

---

**Last Updated**: 2026-02-04  
**Version**: 1.0.0  
**Maintainer**: Direct Team  
