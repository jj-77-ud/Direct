// 测试代理API是否正常工作
async function testProxyAPI() {
  console.log('测试代理API连接...');
  
  // 测试1: 简单的GET请求到代理
  try {
    const response = await fetch('/api/lifi/proxy?endpoint=advanced/routes', {
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
        fromAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // 使用有效的地址
        toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        options: {
          slippage: 0.01,
          order: 'RECOMMENDED'
        }
      })
    });
    
    console.log('代理响应状态:', response.status);
    const text = await response.text();
    console.log('代理响应内容:', text.substring(0, 500));
    
    if (!response.ok) {
      console.error('代理请求失败:', response.status, response.statusText);
      return false;
    }
    
    const data = JSON.parse(text);
    console.log('代理响应JSON:', data.success ? '成功' : '失败');
    return data.success;
    
  } catch (error) {
    console.error('代理请求错误:', error.message);
    return false;
  }
}

// 测试2: 直接测试fetch是否工作
async function testDirectFetch() {
  console.log('\n测试直接fetch到LI.FI API...');
  
  try {
    const response = await fetch('https://li.quest/v1/advanced/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
    
    console.log('直接API响应状态:', response.status);
    const text = await response.text();
    console.log('直接API响应内容:', text.substring(0, 500));
    
    if (!response.ok) {
      console.error('直接API请求失败:', response.status, response.statusText);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('直接API请求错误:', error.message);
    console.log('这可能是预期的CORS错误');
    return false;
  }
}

// 运行测试
async function runTests() {
  console.log('=== 开始代理API调试测试 ===');
  
  // 检查是否在浏览器环境中
  const isBrowser = typeof window !== 'undefined';
  console.log('环境:', isBrowser ? '浏览器' : 'Node.js');
  
  if (isBrowser) {
    const proxyResult = await testProxyAPI();
    console.log('代理API测试结果:', proxyResult ? '通过' : '失败');
    
    const directResult = await testDirectFetch();
    console.log('直接API测试结果:', directResult ? '通过' : '失败（可能是CORS）');
    
    if (!proxyResult) {
      console.error('❌ 代理API测试失败 - 这可能是fetch失败的原因');
    } else {
      console.log('✅ 代理API测试通过');
    }
  } else {
    console.log('在Node.js环境中，跳过浏览器测试');
  }
  
  console.log('=== 测试完成 ===');
}

// 如果在浏览器中运行，执行测试
if (typeof window !== 'undefined') {
  runTests().catch(console.error);
} else {
  console.log('请在浏览器控制台中运行此脚本');
}