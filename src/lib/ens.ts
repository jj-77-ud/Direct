/**
 * ENS SDK Initialization Configuration
 * Encapsulates ENSjs client creation and configuration
 */

import { createPublicClient, http } from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { addEnsContracts, ensPublicActions } from '@ensdomains/ensjs'
import { type ChainId } from '@/constants/chains'

// Environment variable configuration
const MAINNET_RPC = process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://eth-mainnet.g.alchemy.com/v2/demo'
const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://rpc.sepolia.org'

// Chain configuration mapping
const CHAIN_CONFIG: Record<number, { chain: any; rpc: string }> = {
  [mainnet.id]: {
    chain: mainnet,
    rpc: MAINNET_RPC,
  },
  [sepolia.id]: {
    chain: sepolia,
    rpc: SEPOLIA_RPC,
  },
} as const

// ENS supported chains (ENS primarily on Ethereum mainnet and testnets)
export const ENS_SUPPORTED_CHAINS = [mainnet.id, sepolia.id] as const

/**
 * Create ENS client
 * @param chainId Chain ID
 * @returns Public client configured with ENS functionality
 */
export function createEnsClient(chainId: ChainId) {
  const config = CHAIN_CONFIG[chainId]
  if (!config) {
    throw new Error(`Unsupported chain ID for ENS: ${chainId}`)
  }

  // Check if chain supports ENS
  if (!ENS_SUPPORTED_CHAINS.includes(chainId as any)) {
    console.warn(`Chain ${chainId} may not have full ENS support`)
  }

  // Create client and extend with ENS functionality
  const client = createPublicClient({
    chain: addEnsContracts(config.chain),
    transport: http(config.rpc),
  }).extend(ensPublicActions)

  return client
}

/**
 * Get default ENS client (Ethereum mainnet)
 */
export function getDefaultEnsClient() {
  return createEnsClient(mainnet.id)
}

/**
 * Resolve ENS domain to address
 * @param domain ENS domain (e.g., vitalik.eth)
 * @param chainId Chain ID (defaults to Ethereum mainnet)
 * @returns Resolved address or null
 */
export async function resolveEnsDomain(
  domain: string,
  chainId: ChainId = mainnet.id
): Promise<string | null> {
  try {
    const client = createEnsClient(chainId)
    const result = await (client as any).getAddressRecord({
      name: domain,
      coin: 'ETH',
    })
    
    return result?.value || null
  } catch (error) {
    console.error(`Failed to resolve ENS domain ${domain}:`, error)
    return null
  }
}

/**
 * Reverse resolve address to ENS domain
 * @param address Ethereum address
 * @param chainId Chain ID (defaults to Ethereum mainnet)
 * @returns Resolved domain or null
 */
export async function reverseResolveAddress(
  address: string,
  chainId: ChainId = mainnet.id
): Promise<string | null> {
  try {
    const client = createEnsClient(chainId)
    const result = await (client as any).getName({
      address: address as `0x${string}`,
    })
    
    return result?.name || null
  } catch (error) {
    console.error(`Failed to reverse resolve address ${address}:`, error)
    return null
  }
}

/**
 * Check ENS domain availability
 * @param domain ENS domain
 * @param chainId Chain ID (defaults to Ethereum mainnet)
 * @returns Whether domain is available
 */
export async function checkEnsAvailability(
  domain: string,
  chainId: ChainId = mainnet.id
): Promise<boolean> {
  try {
    const client = createEnsClient(chainId)
    const result = await (client as any).getAvailable({
      name: domain,
    })
    
    return result
  } catch (error) {
    console.error(`Failed to check ENS availability for ${domain}:`, error)
    return false
  }
}

/**
 * Get domain information
 * @param domain ENS domain
 * @param chainId Chain ID (defaults to Ethereum mainnet)
 * @returns Domain information
 */
export async function getEnsRecords(
  domain: string,
  chainId: ChainId = mainnet.id
) {
  try {
    const client = createEnsClient(chainId)
    const result = await (client as any).getRecords({
      name: domain,
      texts: ['com.twitter', 'com.github', 'email', 'url'],
      coins: ['ETH', 'BTC'],
      contentHash: true,
      abi: false,
    })
    
    return result
  } catch (error) {
    console.error(`Failed to get ENS records for ${domain}:`, error)
    return null
  }
}

// Type exports
export type EnsClient = ReturnType<typeof createEnsClient>