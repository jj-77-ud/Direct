/**
 * Direct DeepSeek Client
 * 
 * This file provides a client wrapper for interacting with the DeepSeek API.
 * Supports intent parsing, natural language understanding, and AI-assisted decision making.
 * 
 * Security Considerations:
 * 1. API keys must be read from environment variables, never hardcoded
 * 2. All API calls must have timeout and error handling
 * 3. Sensitive data (private keys, addresses) must not be sent to DeepSeek
 */

import { IntentType, type NomadIntent, type ResolveEnsParams, type SwapParams, type BridgeParams, type CctpTransferParams } from '@/types/intent'

// ==================== Configuration and Constants ====================

/**
 * DeepSeek client configuration
 */
export interface DeepSeekClientConfig {
  apiKey: string
  baseURL?: string
  model?: string
  timeout?: number
  maxRetries?: number
  temperature?: number
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<DeepSeekClientConfig> = {
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-chat', // DeepSeek default model
  timeout: 30000, // 30 second timeout
  maxRetries: 3,
  temperature: 0.1, // Low temperature for deterministic output
}

/**
 * Intent parsing system prompt
 */
const INTENT_PARSING_SYSTEM_PROMPT = `You are a professional Web3 intent parser responsible for converting user's natural language instructions into structured blockchain operation intents.

## Your Responsibilities
1. Accurately identify user intent type (swap, cross-chain, ENS resolution, etc.)
2. Extract all necessary parameters (tokens, amounts, chains, etc.)
3. Validate parameter reasonableness and completeness
4. Output standardized JSON format

## Supported Intent Types
- RESOLVE_ENS: Resolve ENS domain to address
- REVERSE_RESOLVE: Reverse resolve address to ENS domain
- SWAP: Token swap (e.g., "swap 1 ETH for USDC")
- BRIDGE: Cross-chain asset transfer (e.g., "bridge 100 USDC from Arbitrum to Base")
- CCTP_TRANSFER: USDC cross-chain using Circle CCTP
- ADD_LIQUIDITY: Add liquidity to Uniswap pool
- REMOVE_LIQUIDITY: Remove liquidity from Uniswap pool

## Output Format Requirements
You must return a valid JSON object containing the following fields:
{
  "intentType": "SWAP",  // or "BRIDGE", "RESOLVE_ENS", etc.
  "description": "user's original instruction",
  "params": { ... },  // intent-specific parameters (see examples below)
  "chainId": 421614,  // target chain ID
  "confidence": 0.85  // parsing confidence 0.0-1.0
}

## Parameter Examples for Different Intent Types

### SWAP Example:
{
  "intentType": "SWAP",
  "description": "swap 1 ETH for USDC",
  "params": {
    "fromToken": "ETH",
    "toToken": "USDC",
    "amountIn": {
      "raw": "1000000000000000000",
      "formatted": "1.0"
    },
    "slippage": 0.5
  },
  "chainId": 421614,
  "confidence": 0.9
}

### BRIDGE Example:
{
  "intentType": "BRIDGE",
  "description": "bridge 100 USDC from Arbitrum to Base",
  "params": {
    "fromChainId": 421614,  // Arbitrum Sepolia
    "toChainId": 84532,     // Base Sepolia
    "token": "USDC",
    "amount": {
      "raw": "100000000",  // 100 USDC (6 decimals)
      "formatted": "100.0"
    }
  },
  "chainId": 421614,
  "confidence": 0.85
}

### RESOLVE_ENS Example:
{
  "intentType": "RESOLVE_ENS",
  "description": "resolve ens domain vitalik.eth",
  "params": {
    "domain": "vitalik.eth"
  },
  "chainId": 1,
  "confidence": 0.95
}

## Important Rules
1. If user instruction is ambiguous or missing required information, return null and explain why
2. Do not generate mock data, clearly mark if information is missing
3. Amounts must include raw value (string) and formatted value (string)
4. Addresses must validate format (0x prefix, 40 hex characters)
5. Chain IDs must use standard network IDs:
   - 1: Ethereum Mainnet
   - 42161: Arbitrum One
   - 421614: Arbitrum Sepolia
   - 8453: Base Mainnet
   - 84532: Base Sepolia
   - 11155111: Sepolia
6. For cross-chain operations (BRIDGE, CCTP_TRANSFER), you MUST extract both fromChainId and toChainId
7. For token amounts, calculate raw value based on token decimals (ETH: 18, USDC: 6)

Now start parsing user instruction:`

// ==================== DeepSeek Client Class ====================

/**
 * Nomad Arc DeepSeek Client
 */
export class NomadDeepSeekClient {
  private config: DeepSeekClientConfig

  constructor(config: DeepSeekClientConfig) {
    // Validate API key
    if (!config.apiKey || config.apiKey === '') {
      throw new Error('DeepSeek API key is required')
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
  }

  // ==================== Core Methods ====================

  /**
   * Parse natural language instruction into structured intent
   */
  async parseIntent(userInput: string): Promise<{
    intent: NomadIntent | null
    confidence: number
    error?: string
  }> {
    try {
      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: INTENT_PARSING_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userInput,
          },
        ],
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
      })

      const responseContent = response.choices?.[0]?.message?.content
      if (!responseContent) {
        throw new Error('Empty response from DeepSeek')
      }

      // Parse JSON response
      const parsedResponse = JSON.parse(responseContent)

      // Check for invalid intent
      if (parsedResponse === null || parsedResponse.intentType === null) {
        return {
          intent: null,
          confidence: 0,
          error: parsedResponse.reason || 'Unable to parse intent',
        }
      }

      // Validate intent type
      const intentType = parsedResponse.intentType as IntentType
      if (!Object.values(IntentType).includes(intentType)) {
        throw new Error(`Invalid intent type: ${intentType}`)
      }

      // Build intent object
      const intent: NomadIntent = {
        id: `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: intentType,
        description: parsedResponse.description || userInput,
        params: parsedResponse.params || {},
        chainId: parsedResponse.chainId || 421614, // Default Arbitrum Sepolia
        createdAt: Date.now(),
      }

      // Validate parameter completeness
      const validationError = this.validateIntentParams(intent)
      if (validationError) {
        return {
          intent: null,
          confidence: parsedResponse.confidence || 0,
          error: validationError,
        }
      }

      return {
        intent,
        confidence: parsedResponse.confidence || 0.5,
      }
    } catch (error) {
      console.error('DeepSeek intent parsing failed:', error)
      return {
        intent: null,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Validate intent parameter completeness
   */
  private validateIntentParams(intent: NomadIntent): string | null {
    switch (intent.type) {
      case IntentType.RESOLVE_ENS:
        const ensParams = intent.params as ResolveEnsParams
        if (!ensParams.domain || typeof ensParams.domain !== 'string') {
          return 'ENS resolution requires domain parameter'
        }
        if (!ensParams.domain.endsWith('.eth')) {
          return 'ENS domain must end with .eth'
        }
        break

      case IntentType.SWAP:
        const swapParams = intent.params as SwapParams
        if (!swapParams.fromToken || !swapParams.toToken) {
          return 'Swap requires source token and target token'
        }
        if (!swapParams.amountIn || !swapParams.amountIn.raw) {
          return 'Swap requires input amount'
        }
        if (swapParams.slippage === undefined) {
          return 'Swap requires slippage tolerance'
        }
        break

      case IntentType.BRIDGE:
        const bridgeParams = intent.params as BridgeParams
        if (!bridgeParams.fromChainId || !bridgeParams.toChainId) {
          return 'Cross-chain requires source chain and target chain IDs'
        }
        if (!bridgeParams.token) {
          return 'Cross-chain requires token information'
        }
        if (!bridgeParams.amount || !bridgeParams.amount.raw) {
          return 'Cross-chain requires amount'
        }
        break

      case IntentType.CCTP_TRANSFER:
        const cctpParams = intent.params as CctpTransferParams
        if (!cctpParams.fromChainId || !cctpParams.toChainId) {
          return 'CCTP cross-chain requires source chain and target chain IDs'
        }
        if (!cctpParams.amount || !cctpParams.amount.raw) {
          return 'CCTP cross-chain requires amount'
        }
        // CCTP only supports USDC
        if (cctpParams.amount && cctpParams.amount.formatted) {
          // USDC validation logic can be added here
        }
        break
    }

    return null
  }

  /**
   * Get AI-assisted cross-chain path recommendation
   */
  async getCrossChainRecommendation(params: {
    fromChainId: number
    toChainId: number
    tokenSymbol: string
    amount: string
  }): Promise<{
    recommendedProtocol: 'LI.FI' | 'Circle CCTP' | 'Other'
    reasoning: string
    estimatedTime: string
    estimatedCost: string
  }> {
    const prompt = `As a cross-chain expert, please analyze the following cross-chain requirement and provide the best path recommendation:

## Cross-chain Requirement
- Source Chain: ${params.fromChainId}
- Target Chain: ${params.toChainId}
- Token: ${params.tokenSymbol}
- Amount: ${params.amount}

## Available Protocols
1. LI.FI: Supports multiple chains and tokens, aggregates multiple cross-chain bridges
2. Circle CCTP: Designed specifically for USDC, official cross-chain solution, fast and low cost
3. Other: Choose based on specific situation

## Output Requirements
Please return JSON format:
{
  "recommendedProtocol": "LI.FI" | "Circle CCTP" | "Other",
  "reasoning": "Selection reasoning (in English)",
  "estimatedTime": "Estimated time (e.g., '5-10 minutes')",
  "estimatedCost": "Estimated cost (e.g., '$5-10' or '0.1%')"
}

## Important Considerations
1. If token is USDC, prioritize Circle CCTP
2. If involving non-USDC tokens, use LI.FI
3. Consider speed, cost, security balance
4. Consider chain congestion`

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a professional cross-chain path optimization expert.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })

      const responseContent = response.choices?.[0]?.message?.content
      if (!responseContent) {
        throw new Error('Empty response from DeepSeek')
      }

      return JSON.parse(responseContent)
    } catch (error) {
      console.error('DeepSeek cross-chain recommendation failed:', error)
      // Return default recommendation
      return {
        recommendedProtocol: params.tokenSymbol === 'USDC' ? 'Circle CCTP' : 'LI.FI',
        reasoning: 'Default recommendation based on token type',
        estimatedTime: '5-15 minutes',
        estimatedCost: 'Depends on network conditions',
      }
    }
  }

  /**
   * Generate user-friendly transaction explanation
   */
  async generateTransactionExplanation(params: {
    intentType: string
    params: any
    estimatedGas: string
    estimatedTime: string
  }): Promise<string> {
    const prompt = `Please generate a friendly, easy-to-understand transaction explanation for the user:

## Transaction Information
- Type: ${params.intentType}
- Parameters: ${JSON.stringify(params.params, null, 2)}
- Estimated Gas: ${params.estimatedGas}
- Estimated Time: ${params.estimatedTime}

## Requirements
1. Explain what this transaction does in simple English
2. Explain involved risks (if any)
3. Explain gas fees and time estimation
4. Keep professional but friendly
5. No more than 200 words`

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model!,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      })

      return response.choices?.[0]?.message?.content || 'Unable to generate explanation'
    } catch (error) {
      console.error('DeepSeek transaction explanation generation failed:', error)
      return 'Transaction explanation generation failed, please check transaction details for specific information.'
    }
  }

  // ==================== HTTP Request Utility Methods ====================

  /**
   * Send request to DeepSeek API
   */
  private async makeRequest(endpoint: string, body: any): Promise<any> {
    const url = `${this.config.baseURL}${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`DeepSeek API request timeout (${this.config.timeout}ms)`)
      }
      
      throw error
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // DeepSeek may not have models endpoint, we use simple chat request for testing
      await this.makeRequest('/chat/completions', {
        model: this.config.model!,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      })
      return true
    } catch (error) {
      console.error('DeepSeek API connection test failed:', error)
      return false
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DeepSeekClientConfig {
    return { ...this.config }
  }
}

// ==================== Singleton Instance ====================

let globalInstance: NomadDeepSeekClient | null = null

/**
 * Get global DeepSeek client instance
 */
export function getDeepSeekClient(): NomadDeepSeekClient {
  if (!globalInstance) {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable not set')
    }
    globalInstance = new NomadDeepSeekClient({ apiKey })
  }
  return globalInstance
}

/**
 * Create new DeepSeek client instance
 */
export function createDeepSeekClient(config: DeepSeekClientConfig): NomadDeepSeekClient {
  return new NomadDeepSeekClient(config)
}