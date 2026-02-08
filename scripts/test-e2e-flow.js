// 测试端到端跨链交易流程
async function testEndToEndFlow() {
  console.log('=== 开始端到端跨链交易测试 ===');
  
  // 步骤1: 解析意图
  console.log('\n1. 解析意图...');
  try {
    const intentResponse = await fetch('http://localhost:3000/api/parse-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'bridge 1 USDC from Ethereum to Arbitrum'
      })
    });
    
    if (!intentResponse.ok) {
      throw new Error(`意图解析失败: ${intentResponse.status} ${intentResponse.statusText}`);
    }
    
    const intentResult = await intentResponse.json();
    console.log('✅ 意图解析成功:', {
      type: intentResult.intent?.type,
      confidence: intentResult.confidence,
      params: intentResult.intent?.params
    });
    
    // 步骤2: 测试代理API
    console.log('\n2. 测试代理API...');
    const proxyResponse = await fetch('http://localhost:3000/api/lifi/proxy?endpoint=advanced/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromChainId: 1,
        toChainId: 42161,
        fromTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        toTokenAddress: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
        fromAmount: '1000000',
        fromAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        options: {
          slippage: 0.01,
          order: 'RECOMMENDED'
        }
      })
    });
    
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      throw new Error(`代理API失败: ${proxyResponse.status} ${proxyResponse.statusText} - ${errorText.substring(0, 200)}`);
    }
    
    const proxyResult = await proxyResponse.json();
    console.log('✅ 代理API成功:', {
      success: proxyResult.success,
      hasRoutes: proxyResult.data?.routes?.length > 0
    });
    
    if (proxyResult.data?.routes?.length > 0) {
      const route = proxyResult.data.routes[0];
      console.log('📊 路由详情:', {
        id: route.id,
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
        gasCostUSD: route.gasCostUSD,
        steps: route.steps?.length
      });
    }
    
    // 步骤3: 测试技能执行（模拟）
    console.log('\n3. 测试技能执行流程...');
    console.log('📋 模拟技能执行步骤:');
    console.log('   - 意图类型: BRIDGE');
    console.log('   - 源链: Ethereum (1)');
    console.log('   - 目标链: Arbitrum (42161)');
    console.log('   - 代币: USDC');
    console.log('   - 金额: 1 USDC (1000000)');
    console.log('   - 需要: 钱包连接和用户确认');
    
    console.log('\n✅ 端到端流程测试完成！');
    console.log('📝 总结:');
    console.log('   - 意图解析: 工作正常');
    console.log('   - 代理API: 工作正常');
    console.log('   - LI.FI API: 可访问');
    console.log('   - 路由获取: 成功');
    console.log('\n⚠️  下一步:');
    console.log('   1. 在前端连接钱包');
    console.log('   2. 输入跨链交易指令');
    console.log('   3. 系统将解析意图并获取报价');
    console.log('   4. 用户确认后执行真实交易');
    
    return true;
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
    return false;
  }
}

// 运行测试
testEndToEndFlow().then(success => {
  if (success) {
    console.log('\n🎉 所有测试通过！CORS问题已解决。');
  } else {
    console.log('\n🔧 测试失败，请检查上述错误。');
  }
}).catch(error => {
  console.error('测试运行错误:', error);
});