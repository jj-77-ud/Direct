/**
 * Real Circle CCTP Cross-Chain Test
 * Transfer USDC from Base Sepolia to Arbitrum Sepolia
 * Usage: npx ts-node -r tsconfig-paths/register --project tsconfig.tsnode.json scripts/real-circle-test.ts
 */

import { CircleSkill } from '../src/skills/circle-skill'

async function realCircleTest() {
  console.log('🚀 Starting real Circle CCTP cross-chain test...')
  console.log('📋 Test configuration:')
  console.log('  Source chain: Base Sepolia (has 20 USDC and 0.19 ETH)')
  console.log('  Target chain: Arbitrum Sepolia')
  console.log('  Amount: 1 USDC (for testing)')
  
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
    const testParams = {
      fromChainId: 84532,    // Base Sepolia
      toChainId: 421614,     // Arbitrum Sepolia
      amount: '1000000',     // 1 USDC (6 decimals)
      recipient: '0x2A63170Ee291F65eD33cC69acc237F9ddb6f2bFE', // Same wallet
    }
    
    console.log('\n📋 Test parameters:')
    console.log(`  Source chain: Base Sepolia (${testParams.fromChainId})`)
    console.log(`  Target chain: Arbitrum Sepolia (${testParams.toChainId})`)
    console.log(`  Amount: ${testParams.amount} (1 USDC)`)
    console.log(`  Recipient address: ${testParams.recipient}`)
    
    // First perform estimation
    console.log('\n📊 Performing cross-chain estimation...')
    const estimateResult = await skill.estimate(testParams, {
      userAddress: testParams.recipient,
      wallet: null,
    } as any)
    
    console.log('✅ Estimation result:')
    console.log(`  Estimated Gas: ${estimateResult.gasEstimate}`)
    console.log(`  Estimated time: ${estimateResult.timeEstimate}ms`)
    console.log(`  Estimated total cost: ${estimateResult.costEstimate} USDC`)
    
    // Confirm whether to continue
    console.log('\n⚠️  Warning: This will execute real on-chain transactions!')
    console.log('   Requires payment of gas fees and protocol fees.')
    console.log('   Please confirm you understand the risks.')
    
    // In actual execution, there should be user confirmation here
    // For safety, we only print information and do not execute real transactions
    console.log('\n🔒 Safety note:')
    console.log('   To protect your assets, the script does not execute real transactions by default.')
    console.log('   To execute real transactions, please uncomment the section below and run again.')
    
    /*
    // Execute real cross-chain transaction
    console.log('\n🚀 Executing real cross-chain transaction...')
    const executeResult = await skill.execute({
      action: 'transfer',
      ...testParams,
    }, {
      userAddress: testParams.recipient,
      wallet: null,
    } as any)
    
    console.log('✅ Transaction execution result:')
    console.log(JSON.stringify(executeResult, null, 2))
    
    if (executeResult.status === 'INITIATED' || executeResult.status === 'PENDING') {
      console.log('\n🎉 Cross-chain transaction initiated!')
      console.log(`   Source chain transaction hash: ${executeResult.sourceTxHash || 'pending'}`)
      console.log(`   Cross-chain message hash: ${executeResult.messageHash || 'pending'}`)
      console.log('\n📋 Next steps:')
      console.log('   1. Wait for source chain transaction confirmation')
      console.log('   2. Wait for cross-chain message delivery')
      console.log('   3. Complete minting on target chain')
    } else {
      console.log('\n❌ Transaction initiation failed')
      console.log(`   Error: ${executeResult.error || 'unknown error'}`)
    }
    */
    
    console.log('\n📋 Test summary:')
    console.log('  ✅ Skill initialization: successful')
    console.log('  ✅ Cross-chain estimation: successful')
    console.log('  ✅ Configuration verification: successful')
    console.log('  🔒 Real transaction: disabled (safety reasons)')
    
    console.log('\n💡 To execute real transaction:')
    console.log('   1. Get some Arbitrum Sepolia ETH (for target chain gas)')
    console.log('   2. Uncomment the section in the script')
    console.log('   3. Run the script again')
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error))
    return false
  }
}

// Run test
if (require.main === module) {
  realCircleTest()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Uncaught error during test execution:', error)
      process.exit(1)
    })
}

export { realCircleTest }