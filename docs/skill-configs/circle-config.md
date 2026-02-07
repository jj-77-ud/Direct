# Circle CCTP Skill Configuration Guide

## Overview

The Circle CCTP skill encapsulates Circle Cross-Chain Transfer Protocol (CCTP) cross-chain logic, specifically designed for secure and fast cross-chain transfer of USDC.

**Bonus Requirement**: Must use CCTP to implement USDC cross-chain transfer.

**Tech Stack**: Use official `@circle-fin/bridge-kit` and `@circle-fin/adapter-viem-v2` for real integration.

## Configuration Hierarchy

### 1. Environment Variables Configuration (Highest Priority)

Configure the following environment variables in the `.env.local` file:

```bash
# Circle CCTP Configuration
CIRCLE_PRIVATE_KEY=0x...  # Private key for testing (production should obtain from wallet)
CIRCLE_IRIS_API_KEY=your_iris_api_key  # Circle Iris API key (optional)

# RPC Node Configuration
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHEREUM_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### 2. Code Configuration

Circle CCTP configuration section in `config/project-config.ts`:

```typescript
export const CIRCLE_CONFIG = {
  // Contract addresses (read from addresses.ts)
  messageTransmitterAddress: getCircleCCTPMessageTransmitterAddress(),
  tokenMessengerAddress: getCircleCCTPTokenMessengerAddress(),
  
  // Supported chain list
  supportedChains: [
    421614,  // Arbitrum Sepolia
    84532,   // Base Sepolia
    11155111, // Ethereum Sepolia
    1,       // Ethereum Mainnet
    42161,   // Arbitrum One
    8453,    // Base Mainnet
  ],
  
  // Default configuration
  defaultGasLimit: '500000',      // Default gas limit
  defaultDeadline: 30 * 60,       // 30-minute default deadline
  
  // Bridge Kit Configuration
  bridgeKitConfig: {
    irisApiUrl: process.env.CIRCLE_IRIS_API_URL || 'https://iris-api-sandbox.circle.com',
    attestationServiceUrl: 'https://iris-api-sandbox.circle.com/attestations',
  },
  
  // Retry configuration
  maxRetries: 5,
  retryDelay: 2000,               // 2-second retry delay
  
  // Debug configuration
  debugMode: process.env.NODE_ENV === 'development',
}
```

### 3. Skill Internal Configuration

Default configuration in `src/skills/circle-skill.ts`:

```typescript
export interface CircleSkillConfig {
  // Circle CCTP contract addresses (typically read from addresses.ts)
  messageTransmitterAddress?: Address
  tokenMessengerAddress?: Address
  
  // Cross-chain configuration
  supportedChains?: number[] // Supported chain list
  defaultGasLimit?: string   // Default gas limit
  
  // Retry configuration
  maxRetries?: number
  retryDelay?: number
  
  // Debug configuration
  debugMode?: boolean

  // Bridge Kit configuration
  privateKey?: `0x${string}` // Optional, private key for testing (production should obtain from wallet)
}
```

## Detailed Configuration Instructions

### Contract Address Management

Circle CCTP uses two core contracts:

1. **MessageTransmitter**: Responsible for receiving and sending cross-chain messages
2. **TokenMessenger**: Responsible for burning and minting USDC

Contract addresses are read from `src/constants/addresses.ts`:

```typescript
// src/constants/addresses.ts
export const getCircleCCTPMessageTransmitterAddress = (chainId: number): Address => {
  switch (chainId) {
    case 421614: // Arbitrum Sepolia
      return '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' as Address
    case 84532: // Base Sepolia
      return '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' as Address
    default:
      throw new Error(`Unsupported chain for Circle CCTP: ${chainId}`)
  }
}

export const getCircleCCTPTokenMessengerAddress = (chainId: number): Address => {
  switch (chainId) {
    case 421614: // Arbitrum Sepolia
      return '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' as Address
    case 84532: // Base Sepolia
      return '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' as Address
    default:
      throw new Error(`Unsupported chain for Circle CCTP: ${chainId}`)
  }
}
```

### Bridge Kit Configuration

Circle official Bridge Kit provides complete CCTP integration:

```typescript
import { BridgeKit, type BridgeChainIdentifier } from '@circle-fin/bridge-kit'
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'

// Initialize Bridge Kit
const bridgeKit = new BridgeKit({
  // Chain configuration
  chains: {
    sourceChain: mapChainIdToBridgeChain(fromChainId),
    destinationChain: mapChainIdToBridgeChain(toChainId),
  },
  
  // Adapter configuration
  adapter: createViemAdapterFromPrivateKey({
    privateKey: config.privateKey || process.env.CIRCLE_PRIVATE_KEY as `0x${string}`,
    chain: fromChainId,
  }),
  
  // Iris API configuration (for obtaining attestations)
  irisApiUrl: process.env.CIRCLE_IRIS_API_URL,
})
```

### Chain ID Mapping

Circle Bridge Kit uses specific chain identifiers:

```typescript
function mapChainIdToBridgeChain(chainId: number): BridgeChainIdentifier {
  switch (chainId) {
    case 421614:  // Arbitrum Sepolia
      return 'Arbitrum_Sepolia' as BridgeChainIdentifier
    case 84532:   // Base Sepolia
      return 'Base_Sepolia' as BridgeChainIdentifier
    case 11155111: // Ethereum Sepolia
      return 'Ethereum_Sepolia' as BridgeChainIdentifier
    case 1:       // Ethereum Mainnet
      return 'Ethereum' as BridgeChainIdentifier
    case 42161:   // Arbitrum One
      return 'Arbitrum' as BridgeChainIdentifier
    case 8453:    // Base Mainnet
      return 'Base' as BridgeChainIdentifier
    default:
      throw new Error(`Unsupported chain ID for Bridge Kit: ${chainId}`)
  }
}
```

## Configuration Validation

### Validation Scripts

Run the following scripts to validate Circle CCTP configuration:

```bash
# Validate Circle CCTP configuration
npm run validate-config -- --skill=circle

# Or run test script directly
npx tsx scripts/test-circle-skill.ts
```

### Validation Steps

1. **Contract Address Check**:
   ```bash
   npx tsx scripts/check-circle-contracts.ts
   ```

2. **Bridge Kit Initialization Test**:
   ```bash
   npx tsx scripts/test-circle-bridge-kit.ts
   ```

3. **Cross-chain Function Test**:
   ```bash
   npx tsx scripts/real-circle-test.ts --test=transfer
   ```

## Troubleshooting

### Common Issues

#### 1. Private Key Configuration Error
**Symptoms**: `Invalid private key` error
**Solutions**:
- Check if private key format is correct (0x prefix, 64 characters)
- Confirm the address corresponding to the private key has sufficient testnet ETH
- In production, private key should be obtained from wallet, not environment variables

#### 2. Contract Address Mismatch
**Symptoms**: `Invalid contract address` error
**Solutions**:
- Check if chain ID is correct
- Verify if contract address matches the network
- Update addresses in `src/constants/addresses.ts`

#### 3. Iris API Connection Failure
**Symptoms**: `Failed to fetch attestation` error
**Solutions**:
- Check if Iris API URL is correct
- Confirm if API key has permissions
- Try using sandbox environment

### Debug Mode

Enable debug mode to get detailed logs:

```typescript
// Enable debugging in code
const circleSkill = new CircleSkill({
  debugMode: true,
  privateKey: process.env.CIRCLE_PRIVATE_KEY as `0x${string}`,
});

// Or set in environment variables
DEBUG_CIRCLE=true npm run dev
```

## Best Practices

### 1. Private Key Security Management
- **Testing Environment**: Can use environment variables to store test private keys
- **Production Environment**: Must obtain from wallet,严禁 hardcoding
- **Key Rotation**: Regularly rotate test private keys

### 2. Gas Optimization
- Monitor gas prices, choose appropriate time for cross-chain execution
- Set reasonable gas limits
- Implement gas price prediction

### 3. Error Handling and Retry
- Implement complete error handling chain
- Implement exponential backoff retry for network errors
- Record detailed error logs for analysis

### 4. Monitoring and Alerting
- Monitor cross-chain transaction success rate
- Set transaction timeout alerts
- Track gas cost changes

## Configuration Examples

### Development Environment Configuration
```typescript
// config/development.ts
export const CIRCLE_CONFIG_DEV = {
  // Use testnet contracts
  messageTransmitterAddress: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  tokenMessengerAddress: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
  
  // Testnet configuration
  supportedChains: [421614, 84532, 11155111],
  
  // Debug configuration
  debugMode: true,
  maxRetries: 3,
}
```

### Production Environment Configuration
```typescript
// config/production.ts
export const CIRCLE_CONFIG_PROD = {
  // Use mainnet contracts
  messageTransmitterAddress: getCircleCCTPMessageTransmitterAddress(1),
  tokenMessengerAddress: getCircleCCTPTokenMessengerAddress(1),
  
  // Mainnet configuration
  supportedChains: [1, 42161, 8453, 10],
  
  // Production configuration
  debugMode: false,
  maxRetries: 5,
  retryDelay: 5000,
}
```

## Cross-chain Process Description

### 1. Source Chain Operations
1. User authorizes USDC to TokenMessenger
2. TokenMessenger burns USDC
3. MessageTransmitter sends cross-chain message

### 2. Cross-chain Message
1. Circle validation chain collects attestations
2. Target chain verifies attestations
3. Message is relayed to target chain

### 3. Target Chain Operations
1. MessageTransmitter verifies message
2. TokenMessenger mints USDC
3. USDC is sent to recipient

## Related Resources

- [Circle CCTP Official Documentation](https://developers.circle.com/stablecoin/docs/cctp-overview)
- [Bridge Kit GitHub](https://github.com/circlefin/bridge-kit)
- [CCTP Contract Addresses](https://developers.circle.com/stablecoin/docs/cctp-contracts)
- [Iris API Documentation](https://developers.circle.com/stablecoin/docs/iris-api)

---

**Last Updated**: 2026-02-04  
**Version**: 1.0.0  
**Maintainer**: Nomad Arc Team  
**Related Files**: 
- `src/skills/circle-skill.ts`
- `src/constants/addresses.ts`
- `config/project-config.ts`
- `scripts/test-circle-skill.ts`
- `scripts/real-circle-test.ts`