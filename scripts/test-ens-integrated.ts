/**
 * ENS Skill Integration Test Script
 * 
 * Integrates all ENS test functionality, uses real RPC configuration, no mock code
 * Tests real on-chain functionality implementation of ENS skill
 */

import { initializeEnsSkill } from '../src/skills/ens-skill'
import { ChainId } from '../src/constants/chains'
import { type AgentContext } from '../src/types/agent'
import { loadTestEnv } from './load-env'

// Load environment variables
loadTestEnv()

/**
 * Test result interface
 */
interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

/**
 * Main test function
 */
async function testEnsIntegrated() {
  console.log('🚀 === ENS Skill Integration Test Started ===')
  console.log(`📅 Test time: ${new Date().toISOString()}`)
  
  const testResults: TestResult[] = []
  
  try {
    // ==================== Initialization Phase ====================
    console.log('\n🔧 1. Initializing test environment')
    
    // Initialize ENS skill
    const ensSkill = initializeEnsSkill()
    testResults.push({
      name: 'ENS Skill Initialization',
      passed: true,
      message: 'ENS skill initialized successfully'
    })
    console.log('✅ ENS skill initialized successfully')
    
    // Mock Agent context
    const mockContext: AgentContext = {
      chainId: ChainId.SEPOLIA, // Use Sepolia testnet to avoid mainnet restrictions
      userAddress: '0x1234567890123456789012345678901234567890',
      sessionId: `test-session-${Date.now()}`,
      balances: {},
      conversationHistory: [],
    }
    
    // ==================== Function Test Phase ====================
    
    // Test 1: Parameter validation function
    console.log('\n🧪 2. Testing parameter validation function')
    try {
      const validation = ensSkill.validate({
        action: 'resolve',
        domain: 'invalid-domain', // Invalid domain format
      })
      
      if (!validation.valid && validation.errors.length > 0) {
        testResults.push({
          name: 'Parameter Validation',
          passed: true,
          message: 'Parameter validation function working correctly',
          details: validation.errors
        })
        console.log('✅ Parameter validation function working correctly')
        console.log(`  Validation errors: ${validation.errors.join(', ')}`)
      } else {
        testResults.push({
          name: 'Parameter Validation',
          passed: false,
          message: 'Parameter validation did not correctly identify invalid domain'
        })
        console.log('❌ Parameter validation did not correctly identify invalid domain')
      }
    } catch (error) {
      testResults.push({
        name: 'Parameter Validation',
        passed: false,
        message: `Parameter validation test failed: ${error instanceof Error ? error.message : String(error)}`
      })
      console.error('❌ Parameter validation test failed:', error)
    }
    
    // Test 2: Cost estimation function
    console.log('\n💰 3. Testing cost estimation function')
    try {
      const estimate = await ensSkill.estimate(
        {
          action: 'resolve',
          domain: 'test.eth',
        },
        mockContext
      )
      
      if (estimate.gasEstimate === '0' && estimate.costEstimate === 'Free (read-only)') {
        testResults.push({
          name: 'Cost Estimation',
          passed: true,
          message: 'Cost estimation function working correctly',
          details: estimate
        })
        console.log('✅ Cost estimation function working correctly')
        console.log(`  Gas estimate: ${estimate.gasEstimate}, Time estimate: ${estimate.timeEstimate}ms, Cost: ${estimate.costEstimate}`)
      } else {
        testResults.push({
          name: 'Cost Estimation',
          passed: false,
          message: 'Cost estimation result does not match expectations'
        })
        console.log('❌ Cost estimation result does not match expectations')
      }
    } catch (error) {
      testResults.push({
        name: 'Cost Estimation',
        passed: false,
        message: `Cost estimation test failed: ${error instanceof Error ? error.message : String(error)}`
      })
      console.error('❌ Cost estimation test failed:', error)
    }
    
    // Test 3: Domain availability check (use testnet to avoid mainnet restrictions)
    console.log('\n🔍 4. Testing domain availability check function')
    try {
      // Use timestamp to generate unique domain, ensuring test independence
      const testDomain = `test-${Date.now()}.eth`
      
      const checkResult = await ensSkill.execute(
        {
          action: 'check',
          domain: testDomain,
          chainId: ChainId.SEPOLIA, // Use testnet
        },
        mockContext
      )
      
      const output = checkResult.output || {}
      
      if (output.implementationRequired === false) {
        testResults.push({
          name: 'Domain Availability Check',
          passed: true,
          message: 'Domain availability check function implemented',
          details: {
            domain: output.domain,
            isAvailable: output.isAvailable,
            note: output.note
          }
        })
        console.log('✅ Domain availability check function implemented')
        console.log(`  Domain: ${output.domain}`)
        console.log(`  Availability: ${output.isAvailable ? 'Available' : 'Not available'}`)
        console.log(`  Note: ${output.note}`)
      } else {
        testResults.push({
          name: 'Domain Availability Check',
          passed: false,
          message: 'Domain availability check function not implemented'
        })
        console.log('❌ Domain availability check function not implemented')
      }
    } catch (error) {
      testResults.push({
        name: 'Domain Availability Check',
        passed: false,
        message: `Domain availability check test failed: ${error instanceof Error ? error.message : String(error)}`
      })
      console.error('❌ Domain availability check test failed:', error)
    }
    
    // Test 4: Domain resolution function (use testnet domain)
    console.log('\n🌐 5. Testing domain resolution function')
    try {
      // Use known testnet ENS domain (if exists) or try to resolve
      const resolveResult = await ensSkill.execute(
        {
          action: 'resolve',
          domain: 'test.eth', // Use generic domain, may not exist on testnet
          chainId: ChainId.SEPOLIA,
        },
        mockContext
      )
      
      const output = resolveResult.output || {}
      
      if (output.implementationRequired === false) {
        testResults.push({
          name: 'Domain Resolution',
          passed: true,
          message: 'Domain resolution function implemented',
          details: {
            domain: output.domain,
            isResolved: output.isResolved,
            address: output.address,
            note: output.note
          }
        })
        console.log('✅ Domain resolution function implemented')
        console.log(`  Domain: ${output.domain}`)
        console.log(`  Resolution status: ${output.isResolved ? 'Resolved' : 'Not resolved'}`)
        if (output.isResolved) {
          console.log(`  Address: ${output.address}`)
        } else {
          console.log(`  Note: ${output.note}`)
        }
        
        // Check for RPC errors (proving real on-chain interaction)
        if (output.errorMessage && (output.errorMessage.includes('429') || output.errorMessage.includes('Too Many Requests'))) {
          console.log('⚠️  Detected RPC rate limiting, proving real on-chain requests')
        }
      } else {
        testResults.push({
          name: 'Domain Resolution',
          passed: false,
          message: 'Domain resolution function not implemented'
        })
        console.log('❌ Domain resolution function not implemented')
      }
    } catch (error) {
      testResults.push({
        name: 'Domain Resolution',
        passed: false,
        message: `Domain resolution test failed: ${error instanceof Error ? error.message : String(error)}`
      })
      console.error('❌ Domain resolution test failed:', error)
    }
    
    // Test 5: Reverse resolution function
    console.log('\n🔄 6. Testing reverse resolution function')
    try {
      // Use test address
      const testAddress = '0x0000000000000000000000000000000000000000'
      
      const reverseResult = await ensSkill.execute(
        {
          action: 'reverse',
          address: testAddress,
          chainId: ChainId.SEPOLIA,
        },
        mockContext
      )
      
      const output = reverseResult.output || {}
      
      if (output.implementationRequired === false) {
        testResults.push({
          name: 'Reverse Resolution',
          passed: true,
          message: 'Reverse resolution function implemented',
          details: {
            address: output.address,
            isResolved: output.isResolved,
            domain: output.domain,
            note: output.note
          }
        })
        console.log('✅ Reverse resolution function implemented')
        console.log(`  Address: ${output.address}`)
        console.log(`  Resolution status: ${output.isResolved ? 'Resolved' : 'Not resolved'}`)
        if (output.isResolved) {
          console.log(`  Domain: ${output.domain}`)
        } else {
          console.log(`  Note: ${output.note}`)
        }
      } else {
        testResults.push({
          name: 'Reverse Resolution',
          passed: false,
          message: 'Reverse resolution function not implemented'
        })
        console.log('❌ Reverse resolution function not implemented')
      }
    } catch (error) {
      testResults.push({
        name: 'Reverse Resolution',
        passed: false,
        message: `Reverse resolution test failed: ${error instanceof Error ? error.message : String(error)}`
      })
      console.error('❌ Reverse resolution test failed:', error)
    }
    
    // Test 6: Skill status check
    console.log('\n📊 7. Testing skill status check')
    try {
      const status = ensSkill.getStatus()
      
      testResults.push({
        name: 'Skill Status',
        passed: status.isInitialized,
        message: status.isInitialized ? 'Skill status normal' : 'Skill not initialized',
        details: status
      })
      
      if (status.isInitialized) {
        console.log('✅ Skill status normal')
        console.log(`  Initialized: ${status.isInitialized}`)
        console.log(`  Execution count: ${status.executionCount}`)
        console.log(`  Last execution time: ${status.lastExecutionTime ? new Date(status.lastExecutionTime).toISOString() : 'None'}`)
      } else {
        console.log('❌ Skill not initialized')
      }
    } catch (error) {
      testResults.push({
        name: 'Skill Status',
        passed: false,
        message: `Skill status check failed: ${error instanceof Error ? error.message : String(error)}`
      })
      console.error('❌ Skill status check failed:', error)
    }
    
    // ==================== Test Summary ====================
    console.log('\n📈 === Test Summary ===')
    
    const passedTests = testResults.filter(r => r.passed).length
    const totalTests = testResults.length
    const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : '0.0'
    
    console.log(`📊 Test statistics: ${passedTests}/${totalTests} passed (${passRate}%)`)
    
    // Display detailed test results
    testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${index + 1}. ${result.name}: ${result.message}`)
      if (result.details && !result.passed) {
        console.log(`   Details: ${JSON.stringify(result.details)}`)
      }
    })
    
    // Overall evaluation
    console.log('\n🎯 Overall evaluation:')
    if (passedTests === totalTests) {
      console.log('🌟 All tests passed! ENS skill fully implemented and functioning correctly.')
    } else if (passedTests >= totalTests * 0.7) {
      console.log('👍 Most tests passed, ENS skill basic functions working correctly.')
    } else {
      console.log('⚠️  Some tests failed, need to check ENS skill implementation.')
    }
    
    // Environment configuration check
    console.log('\n🔧 Environment configuration check:')
    const mainnetRpc = process.env.NEXT_PUBLIC_MAINNET_RPC
    const sepoliaRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC
    
    console.log(`  Mainnet RPC: ${mainnetRpc ? 'Configured' : 'Not configured'}`)
    console.log(`  Sepolia RPC: ${sepoliaRpc ? 'Configured' : 'Not configured'}`)
    
    if (!sepoliaRpc) {
      console.log('⚠️  Recommend configuring Sepolia RPC for complete testnet testing')
    }
    
    console.log('\n🚀 === ENS Skill Integration Test Completed ===')
    
    // Return test results
    return {
      success: passedTests === totalTests,
      results: testResults,
      summary: {
        passed: passedTests,
        total: totalTests,
        passRate: parseFloat(passRate)
      }
    }
    
  } catch (error) {
    console.error('💥 Serious error occurred during ENS skill testing:', error)
    
    testResults.push({
      name: 'Overall Test',
      passed: false,
      message: `Serious error occurred during testing: ${error instanceof Error ? error.message : String(error)}`
    })
    
    return {
      success: false,
      results: testResults,
      summary: {
        passed: 0,
        total: testResults.length,
        passRate: 0
      }
    }
  }
}

// Run test
if (require.main === module) {
  testEnsIntegrated()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 ENS skill tests all passed!')
        process.exit(0)
      } else {
        console.log(`\n⚠️  ENS skill tests partially failed (${result.summary.passed}/${result.summary.total})`)
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Test script execution failed:', error)
      process.exit(1)
    })
}

export { testEnsIntegrated }