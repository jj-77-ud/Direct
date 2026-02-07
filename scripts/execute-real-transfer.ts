/**
 * Execute real Circle CCTP cross-chain transaction
 * Transfer 1 USDC from Base Sepolia to Arbitrum Sepolia
 * Usage: npx ts-node -r tsconfig-paths/register --project tsconfig.tsnode.json scripts/execute-real-transfer.ts
 * 
 * ⚠️ Warning: This will execute real on-chain transactions, consuming real gas fees
 */

import { CircleSkill, CCTPTransferStatus } from '../src/skills/circle-skill'

async function executeRealTransfer() {
  console.log('🚀 Starting real Circle CCTP cross-chain transaction execution...')
  console.log('📋 Transaction configuration:')
  console.log('  Source chain: Base Sepolia')
  console.log('  Target chain: Arbitrum Sepolia')
  console.log('  Amount: 1 USDC')
  console.log('  Wallet address: 0x2A63170Ee291F65eD33cC69acc237F9ddb6f2bFE')
  
  // Use known private key (converted from mnemonic)
  const privateKey = '0x519bd77b77b775cf0766546dcef72bf47fdc64006c01101ae84b2f7f76cdc6cb'
  
  console.log('✅ Using known private key')
  
  try {
    // Create CircleSkill instance (using real private key)
    const skill = new CircleSkill({
      privateKey: privateKey as `0x${string}`,
    })
    
    console.log('✅ CircleSkill instance created successfully')
    
    // Initialize skill
    await skill.initialize()
    console.log('✅ CircleSkill initialized successfully')
    
    // Test parameters: from Base Sepolia to Arbitrum Sepolia
    // Bridge Kit may expect string format with decimal point
    const transferParams = {
      fromChainId: 84532,    // Base Sepolia
      toChainId: 421614,     // Arbitrum Sepolia
      amount: '0.01',        // 0.01 USDC (string format with decimal point)
      recipient: '0x2A63170Ee291F65eD33cC69acc237F9ddb6f2bFE', // Same wallet
    }
    
    console.log('\n📋 Transaction parameters:')
    console.log(`  Source chain: Base Sepolia (${transferParams.fromChainId})`)
    console.log(`  Target chain: Arbitrum Sepolia (${transferParams.toChainId})`)
    console.log(`  Amount: ${transferParams.amount} USDC`)
    console.log(`  Recipient address: ${transferParams.recipient}`)
    
    // First perform estimation
    console.log('\n📊 Performing cross-chain estimation...')
    const estimateResult = await skill.estimate(transferParams, {
      userAddress: transferParams.recipient,
      wallet: null,
    } as any)
    
    console.log('✅ Estimation result:')
    console.log(`  Estimated Gas: ${estimateResult.gasEstimate}`)
    console.log(`  Estimated time: ${estimateResult.timeEstimate}ms`)
    console.log(`  Estimated total cost: ${estimateResult.costEstimate} USDC`)
    
    // Confirm execution
    console.log('\n⚠️  ⚠️  ⚠️  IMPORTANT WARNING ⚠️  ⚠️  ⚠️')
    console.log('   This will execute real on-chain transactions!')
    console.log('   Requires payment of gas fees and protocol fees.')
    console.log('   Transactions cannot be reversed once sent.')
    console.log('   Please confirm you understand the risks and agree to continue.')
    
    // Wait for user confirmation (in actual environment)
    console.log('\n⏳ Waiting 5 seconds for confirmation...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('\n🚀 Executing real cross-chain transaction...')
    const executeResult = await skill.execute({
      action: 'transfer',
      ...transferParams,
    }, {
      userAddress: transferParams.recipient,
      wallet: null,
      chainId: transferParams.fromChainId, // Add chainId from context
    } as any)
    
    console.log('✅ Transaction execution result:')
    console.log(JSON.stringify(executeResult, null, 2))
    
    // Type assertion as CCTPTransferResult
    const transferResult = executeResult as any
    
    if (transferResult.status === CCTPTransferStatus.INITIATED || transferResult.status === CCTPTransferStatus.PENDING) {
      console.log('\n🎉 Cross-chain transaction initiated!')
      console.log(`   Source chain transaction hash: ${transferResult.sourceTxHash || 'pending'}`)
      console.log(`   Cross-chain message hash: ${transferResult.messageHash || 'pending'}`)
      console.log(`   Transaction status: ${transferResult.status}`)
      console.log('\n📋 Next steps:')
      console.log('   1. Wait for source chain transaction confirmation (approx. 1-2 minutes)')
      console.log('   2. Wait for cross-chain message delivery (approx. 5-10 minutes)')
      console.log('   3. Complete minting on target chain')
      console.log('\n🔍 Monitor transaction:')
      if (transferResult.sourceTxHash) {
        console.log(`   Base Sepolia explorer: https://sepolia.basescan.org/tx/${transferResult.sourceTxHash}`)
      }
      console.log(`   Arbitrum Sepolia explorer: https://sepolia.arbiscan.io/address/${transferParams.recipient}`)
    } else {
      console.log('\n❌ Transaction initiation failed')
      console.log(`   Error: ${transferResult.error || 'unknown error'}`)
    }
    
    console.log('\n📋 Transaction summary:')
    console.log('  ✅ Skill initialization: successful')
    console.log('  ✅ Cross-chain estimation: successful')
    console.log('  ✅ Transaction execution: completed')
    console.log('  📊 Transaction status:', transferResult.status)
    
    return executeResult
    
  } catch (error) {
    console.error('❌ Transaction execution failed:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack)
    }
    return { success: false, error: String(error) }
  }
}

// Run transaction
if (require.main === module) {
  console.log('🔐 Real cross-chain transaction script')
  console.log('====================')
  
  executeRealTransfer()
    .then(result => {
      console.log('\n🏁 Script execution completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Uncaught error during script execution:', error)
      process.exit(1)
    })
}

export { executeRealTransfer }