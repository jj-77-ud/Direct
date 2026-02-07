# Environment Configuration Guide

> This file contains all environment configuration information required for the Nomad Arc project.

## Table of Contents
1. [SDK Configuration](#sdk-configuration)
2. [Blockchain Configuration](#blockchain-configuration)
3. [API Keys](#api-keys)
4. [Contract Addresses](#contract-addresses)
5. [Environment Variables](#environment-variables)

---

## SDK Configuration

### Circle Arc SDK
- **Status**: To be configured
- **Description**: Used for USDC CCTP cross-chain settlement
- **Configuration Location**: `temp-configs/sdk-info/circle-sdk.md`

### LI.FI SDK
- **Status**: To be configured
- **Description**: Used for cross-chain routing and quotes
- **Configuration Location**: `temp-configs/sdk-info/lifi-sdk.md`

### Uniswap v4 SDK
- **Status**: To be configured
- **Description**: Used for Uniswap v4 trading interactions
- **Configuration Location**: `temp-configs/sdk-info/uniswap-sdk.md`

### ENSjs
- **Status**: To be configured
- **Description**: Used for ENS domain resolution
- **Configuration Location**: `temp-configs/sdk-info/ens-sdk.md`

## Blockchain Configuration

### Supported Chains
- **Arbitrum Sepolia**: Primary testnet
- **Base Sepolia**: Secondary testnet
- **Ethereum Sepolia**: Backup testnet
- **Ethereum Mainnet**: Production environment

### RPC Endpoints
- **Configuration Location**: `temp-configs/blockchain-config/rpc-endpoints.md`

### Wallet Connection
- **WalletConnect**: Used for wallet connections
- **Configuration Location**: `temp-configs/blockchain-config/wallet-connect.md`

## API Keys

### OpenAI
- **Purpose**: AI intent parsing
- **Application Link**: To be configured
- **Configuration Location**: `temp-configs/api-keys/openai.md`

### Blockchain Nodes
- **Alchemy/Infura**: Blockchain node services
- **Application Link**: To be configured
- **Configuration Location**: `temp-configs/api-keys/alchemy-infura.md`

### WalletConnect
- **Project ID**: WalletConnect project ID
- **Application Link**: To be configured
- **Configuration Location**: `temp-configs/api-keys/walletconnect.md`

## Contract Addresses

### Arbitrum Sepolia
- **Uniswap v4 PoolManager**: To be configured
- **Circle CCTP Contract**: To be configured
- **LI.FI Executor**: To be configured
- **ENS Registry**: To be configured
- **Configuration Location**: `temp-configs/contract-addresses/arbitrum-sepolia.md`

### Base Sepolia
- **Configuration Location**: `temp-configs/contract-addresses/base-sepolia.md`

## Environment Variables

### `.env.local` Template
```env
# OpenAI
OPENAI_API_KEY=

# Blockchain RPC
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=
NEXT_PUBLIC_BASE_SEPOLIA_RPC=
NEXT_PUBLIC_MAINNET_RPC=
NEXT_PUBLIC_SEPOLIA_RPC=

# WalletConnect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=

# Node Services
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_INFURA_API_KEY=
```

---

## Changelog
- **2026-01-29**: Created environment configuration document framework
- **2026-01-29**: Awaiting specific information from `temp-configs/` directory