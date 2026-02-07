# AI System Configuration Guide

## Overview

The AI system is responsible for natural language intent parsing, converting user's natural language instructions into structured blockchain operation intents, and coordinating the scheduling and execution of multiple skills.

**Core Components**:
1. **DeepSeek Client**: Handles natural language intent parsing
2. **Intent Parser**: Connects AI and skill execution
3. **Workflow Scheduler**: Coordinates scheduling and execution of multiple skills

## Configuration Hierarchy

### 1. Environment Variables Configuration (Highest Priority)

Configure the following environment variables in the `.env.local` file:

```bash
# DeepSeek API Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com  # Optional, default official API

# AI System Configuration
AI_MAX_RETRIES=3
AI_TIMEOUT=30000          # 30-second timeout
AI_TEMPERATURE=0.1        # Low temperature for deterministic output

# Cache Configuration
AI_CACHE_ENABLED=true
AI_CACHE_TTL=300000       # 5-minute cache

# Debug Configuration
DEBUG_AI=false
AI_LOG_LEVEL=info         # debug, info, warn, error
```

### 2. Code Configuration

AI system configuration section in `config/project-config.ts`:

```typescript
export const AI_CONFIG = {
  // DeepSeek API Configuration
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    timeout: process.env.AI_TIMEOUT ? parseInt(process.env.AI_TIMEOUT) : 30000,
    maxRetries: process.env.AI_MAX_RETRIES ? parseInt(process.env.AI_MAX_RETRIES) : 3,
    temperature: process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : 0.1,
  },
  
  // Intent Parsing Configuration
  intentParsing: {
    systemPrompt: INTENT_PARSING_SYSTEM_PROMPT, // Imported from deepseek-client.ts
    responseFormat: { type: 'json_object' },
    maxTokens: 2000,
    confidenceThreshold: 0.7, // Confidence threshold, below this requires manual confirmation
  },
  
  // Cache Configuration
  cache: {
    enabled: process.env.AI_CACHE_ENABLED === 'true',
    ttl: process.env.AI_CACHE_TTL ? parseInt(process.env.AI_CACHE_TTL) : 5 * 60 * 1000,
    maxSize: 1000, // Maximum cache entries
  },
  
  // Workflow Configuration
  workflow: {
    maxConcurrentTasks: 3,      // Maximum concurrent tasks
    taskTimeout: 5 * 60 * 1000, // 5-minute task timeout
    retryPolicy: {
      maxRetries: 3,
      backoffFactor: 2,         // Exponential backoff factor
      initialDelay: 1000,       // Initial delay 1 second
    },
  },
  
  // Debug Configuration
  debug: {
    enabled: process.env.DEBUG_AI === 'true',
    logLevel: process.env.AI_LOG_LEVEL || 'info',
    logRequests: false,         // Whether to log request content (may contain sensitive information)
    logResponses: false,        // Whether to log response content
  },
  
  // Security Configuration
  security: {
    maxInputLength: 1000,       // Maximum input length
    sanitizeInput: true,        // Whether to sanitize input
    blockSensitivePatterns: [   // Block sensitive patterns
      'private key',
      'mnemonic',
      'seed phrase',
      /0x[0-9a-fA-F]{64}/,      // Private key pattern
    ],
  },
}
```

### 3. Client Internal Configuration

Default configuration in `src/lib/ai/deepseek-client.ts`:

```typescript
export interface DeepSeekClientConfig {
  apiKey: string
  baseURL?: string
  model?: string
  timeout?: number
  maxRetries?: number
  temperature?: number
}

const DEFAULT_CONFIG: Partial<DeepSeekClientConfig> = {
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-chat', // DeepSeek default model
  timeout: 30000, // 30-second timeout
  maxRetries: 3,
  temperature: 0.1, // Low temperature for deterministic output
}
```

## Detailed Configuration Instructions

### DeepSeek API Configuration

#### Obtaining API Key
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Register an account and create an application
3. Obtain API key

#### Environment Variable Setup
```bash
# .env.local
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_MODEL=deepseek-chat  # or deepseek-coder
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

#### Model Selection
- `deepseek-chat`: General conversation model, suitable for intent parsing
- `deepseek-coder`: Code generation model, suitable for technical tasks
- `deepseek-reasoner`: Reasoning model, suitable for complex logic

### Intent Parsing System Prompt

The system prompt is the core of AI intent parsing, defined in `src/lib/ai/deepseek-client.ts`:

```typescript
const INTENT_PARSING_SYSTEM_PROMPT = `You are a professional Web3 intent parser, responsible for converting user's natural language instructions into structured blockchain operation intents.

## Your Responsibilities
1. Accurately identify user intent types (swap, cross-chain, ENS resolution, etc.)
2. Extract all necessary parameters (token, amount, chain, etc.)
3. Validate parameter reasonableness and completeness
4. Output standardized JSON format

## Supported Intent Types
- RESOLVE_ENS: Resolve ENS domain to address
- REVERSE_RESOLVE: Reverse resolve address to ENS domain
- SWAP: Token swap (e.g., "swap 1 ETH for USDC")
- BRIDGE: Cross-chain asset transfer (e.g., "transfer 100 USDC from Arbitrum to Base")
- CCTP_TRANSFER: Use Circle CCTP for USDC cross-chain transfer
- ADD_LIQUIDITY: Add liquidity to Uniswap pool
- REMOVE_LIQUIDITY: Remove liquidity from Uniswap pool

## Output Format Requirements
You must return a valid JSON object containing the following fields:
{
  "intentType": "Intent type enum value",
  "description": "User's original instruction",
  "params": { ... }, // Intent-specific parameters
  "chainId": number, // Target chain ID (e.g., 421614 for Arbitrum Sepolia)
  "confidence": 0.0-1.0 // Parsing confidence
}

## Important Rules
1. If user instruction is unclear or missing necessary information, return null and explain the reason
2. Do not generate mock data, clearly mark if information is missing
3. Amounts must include original value and formatted value
4. Addresses must validate format (0x prefix, 40 hexadecimal characters)
5. Chain IDs must use standard network IDs
`
```

### Cache Configuration

The AI system uses caching to improve performance and reduce API calls:

```typescript
// Cache implementation example
import NodeCache from 'node-cache'

export class AICache {
  private cache: NodeCache
  
  constructor(config: { ttl: number; maxSize: number }) {
    this.cache = new NodeCache({
      stdTTL: config.ttl / 1000, // Convert to seconds
      maxKeys: config.maxSize,
      useClones: false,
    })
  }
  
  // Generate cache key (based on input and configuration)
  private generateCacheKey(input: string, config: any): string {
    return `ai:${hash(input + JSON.stringify(config))}`
  }
  
  // Get or compute cached result
  async getOrCompute(input: string, computeFn: () => Promise<any>): Promise<any> {
    const cacheKey = this.generateCacheKey(input, this.config)
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const result = await computeFn()
    this.cache.set(cacheKey, result)
    return result
  }
}
```

## Configuration Validation

### Validation Scripts

Run the following scripts to validate AI system configuration:

```bash
# Validate AI system configuration
npm run validate-config -- --skill=ai

# Test DeepSeek API connection
npx tsx scripts/test-deepseek-simple.js

# Test intent parsing
npx tsx scripts/test-intent.ts --input="swap 1 ETH for USDC"
```

### Validation Steps

1. **API Key Check**:
   ```bash
   node -e "console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✓ Set' : '✗ Missing')"
   ```

2. **API Connection Test**:
   ```bash
   npx tsx scripts/test-deepseek.ts --test=connection
   ```

3. **Intent Parsing Test**:
   ```bash
   npx tsx scripts/test-intent.ts --test=basic
   ```

4. **Workflow Test**:
   ```bash
   npx tsx scripts/test-orchestrator.ts --test=simple
   ```

## Troubleshooting

### Common Issues

#### 1. Invalid API Key
**Symptoms**: `401 Unauthorized` error
**Solutions**:
- Check if API key is correct
- Confirm if the key has balance
- Verify if environment variables are loaded

#### 2. Request Timeout
**Symptoms**: `Request timeout` error
**Solutions**:
- Increase timeout (e.g., 60 seconds)
- Check network connection
- Use more stable network environment

#### 3. Inaccurate Intent Parsing
**Symptoms**: Parsing results don't match expectations
**Solutions**:
- Adjust system prompt
- Lower temperature parameter (more deterministic output)
- Increase input description detail

### Debug Mode

Enable debug mode to get detailed logs:

```typescript
// Enable debugging in code
const deepseekClient = new NomadDeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
  debugMode: true,
});

// Or set in environment variables
DEBUG_AI=true npm run dev
```

## Best Practices

### 1. Prompt Engineering
- Keep prompts clear and specific
- Include example inputs and outputs
- Define clear boundaries and rules
- Regularly optimize and test prompt effectiveness

### 2. Error Handling
- Implement complete error handling chain
- Provide user-friendly error messages
- Record detailed error logs for analysis
- Implement graceful degradation (e.g., use rule engine when API fails)

### 3. Performance Optimization
- Use caching to reduce repeated API calls
- Implement request batching
- Monitor API usage and costs
- Set reasonable rate limits

### 4. Security
- Validate and sanitize user input
- Prevent sensitive information leakage
- Implement rate limiting to prevent abuse
- Monitor abnormal access patterns

## Configuration Examples

### Development Environment Configuration
```typescript
// config/development.ts
export const AI_CONFIG_DEV = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY_DEV,
    model: 'deepseek-chat',
    temperature: 0.2, // Slightly higher temperature to explore more possibilities
    timeout: 60000,   // 60-second timeout
  },
  
  debug: {
    enabled: true,
    logLevel: 'debug',
    logRequests: true,  // Log requests in development environment
  },
  
  cache: {
    enabled: true,
    ttl: 60 * 1000, // 1-minute cache
  },
}
```

### Production Environment Configuration
```typescript
// config/production.ts
export const AI_CONFIG_PROD = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY_PROD,
    model: 'deepseek-chat',
    temperature: 0.1, // Low temperature for stability
    timeout: 30000,   // 30-second timeout
  },
  
  debug: {
    enabled: false,
    logLevel: 'warn',  // Only log warnings and errors
    logRequests: false, // Do not log requests in production
  },
  
  cache: {
    enabled: true,
    ttl: 10 * 60 * 1000, // 10-minute cache
  },
  
  security: {
    maxInputLength: 500, // Stricter input limits
    sanitizeInput: true,
  },
}
```

## Workflow Description

### 1. Intent Parsing Process
1. Receive user natural language input
2. Clean and validate input
3. Call DeepSeek API for intent parsing
4. Validate parsing result structure and completeness
5. Return structured intent

### 2. Skill Scheduling Process
1. Select corresponding skill based on intent type
2. Validate skill parameters
3. Execute skill and monitor status
4. Process skill execution results
5. Return final result to user

### 3. Error Handling Process
1. Capture errors during execution
2. Classify error types (network, parameter, skill, etc.)
3. Take appropriate measures based on error type (retry, degrade, report error)
4. Record error logs for analysis
5. Return user-friendly error messages

## Related Resources

- [DeepSeek Official Documentation](https://platform.deepseek.com/api-docs/)
- [Intent Parsing Best Practices](https://platform.deepseek.com/guides/intent-parsing)
- [Prompt Engineering Guide](https://platform.deepseek.com/guides/prompt-engineering)
- [API Rate Limits](https://platform.deepseek.com/guides/rate-limits)

---

**Last Updated**: 2026-02-04  
**Version**: 1.0.0  
**Maintainer**: Nomad Arc Team  
**Related Files**: 
- `src/lib/ai/deepseek-client.ts`
- `src/lib/ai/intent-parser.ts`
- `src/lib/workflow/orchestrator.ts`
- `config/project-config.ts`
- `scripts/test-deepseek.ts`
- `scripts/test-intent.ts`
- `scripts/test-orchestrator.ts`