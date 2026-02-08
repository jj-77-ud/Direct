/**
 * ERC20 Standard ABI (simplified)
 * This file contains only the ERC20 ABI to avoid SSR issues with Uniswap SDK imports
 */

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [
      { name: 'account', type: 'address' },
    ],
    outputs: [
      { name: 'balance', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { name: 'success', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { name: 'success', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [
      { name: 'remaining', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'totalSupply',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'supply', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'decimals', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'symbol', type: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'name', type: 'string' },
    ],
    stateMutability: 'view',
  },
] as const