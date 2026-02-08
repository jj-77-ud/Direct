import { NextRequest, NextResponse } from 'next/server';

/**
 * 映射链ID到LI.FI支持的链ID
 * LI.FI生产API只支持主网链ID，测试网链ID需要映射到对应的主网ID
 */
function mapChainIdForLiFi(chainId: number): number {
  // LI.FI production API only supports mainnet chain IDs
  // Testnet chain IDs must be mapped to their corresponding mainnet IDs
  const LI_FI_SUPPORTED_MAINNET_IDS = new Set([
    1,      // Ethereum Mainnet
    42161,  // Arbitrum Mainnet
    10,     // Optimism Mainnet
    137,    // Polygon Mainnet
    43114,  // Avalanche Mainnet
    56,     // BSC Mainnet
    8453,   // Base Mainnet
  ]);

  // If chain ID is already a supported mainnet ID, return as-is
  if (LI_FI_SUPPORTED_MAINNET_IDS.has(chainId)) {
    return chainId;
  }

  // Map testnet and unsupported chain IDs to mainnet IDs
  const chainIdMapping: Record<number, number> = {
    // Testnet to Mainnet mappings
    421614: 42161,    // Arbitrum Sepolia -> Arbitrum Mainnet
    84532: 8453,      // Base Sepolia -> Base Mainnet
    11155111: 1,      // Sepolia -> Ethereum Mainnet
    80001: 137,       // Mumbai -> Polygon Mainnet
    5: 1,             // Goerli -> Ethereum Mainnet
    97: 56,           // BSC Testnet -> BSC Mainnet
    
    // Sandbox and custom chain mappings
    31337: 42161,     // BuildBear Arbitrum Sandbox -> Arbitrum Mainnet
    5042002: 42161,   // Circle Arc Testnet -> Arbitrum Mainnet
  };

  const mappedId = chainIdMapping[chainId];
  if (mappedId) {
    console.log(`🔗 Chain ID mapping in proxy: ${chainId} -> ${mappedId}`);
    return mappedId;
  }

  // If no mapping found, check if it's already a mainnet ID (even if not in our list)
  if (chainId < 10000) { // Most mainnet IDs are under 10000
    console.log(`⚠️ Chain ID ${chainId} is not in our known mainnet list, but trying as-is`);
    return chainId;
  }

  // If no mapping found and looks like testnet, default to Arbitrum Mainnet
  console.warn(`⚠️ Chain ID ${chainId} is not supported by LI.FI API, defaulting to Arbitrum Mainnet (42161)`);
  return 42161;
}

/**
 * 映射token地址到主网地址
 * 当链ID从测试网映射到主网时，token地址也需要相应映射
 */
function mapTokenAddressForLiFi(tokenAddress: string, originalChainId: number, mappedChainId: number): string {
  // Token address mapping from testnet to mainnet
  const TOKEN_ADDRESS_MAPPING: Record<string, string> = {
    // Base Sepolia USDC -> Base Mainnet USDC
    '0x036cbd53842c5426634e7929541ec2318f3dcf7e': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    // Arbitrum Sepolia USDC -> Arbitrum Mainnet USDC
    '0x75faf114eafb1bdbe2f0316df893fd58ce46aa1d': '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    // Base Sepolia WETH -> Base Mainnet WETH
    '0x4200000000000000000000000000000000000006': '0x4200000000000000000000000000000000000006', // Same address
    // Arbitrum Sepolia WETH -> Arbitrum Mainnet WETH
    '0x980b62da83eff3d4576c647993b0c1d7faf17c73': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  };

  const lowerTokenAddress = tokenAddress.toLowerCase();
  
  // Check if token address needs mapping
  if (TOKEN_ADDRESS_MAPPING[lowerTokenAddress]) {
    const mappedAddress = TOKEN_ADDRESS_MAPPING[lowerTokenAddress];
    console.log(`🔗 Token address mapping in proxy: ${tokenAddress} -> ${mappedAddress} (chain ${originalChainId} -> ${mappedChainId})`);
    return mappedAddress;
  }

  // If no mapping found, return original address
  return tokenAddress;
}

/**
 * LI.FI API 代理路由
 * 解决浏览器CORS限制，将前端请求转发到LI.FI API
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    
    // 应用链ID映射
    const mappedBody = { ...body };
    const originalFromChainId = typeof body.fromChainId === 'number' ? body.fromChainId : undefined;
    const originalToChainId = typeof body.toChainId === 'number' ? body.toChainId : undefined;
    
    if (typeof mappedBody.fromChainId === 'number') {
      mappedBody.fromChainId = mapChainIdForLiFi(mappedBody.fromChainId);
    }
    if (typeof mappedBody.toChainId === 'number') {
      mappedBody.toChainId = mapChainIdForLiFi(mappedBody.toChainId);
    }
    
    // 应用token地址映射
    if (typeof mappedBody.fromTokenAddress === 'string' && originalFromChainId !== undefined) {
      mappedBody.fromTokenAddress = mapTokenAddressForLiFi(
        mappedBody.fromTokenAddress,
        originalFromChainId,
        mappedBody.fromChainId
      );
    }
    if (typeof mappedBody.toTokenAddress === 'string' && originalToChainId !== undefined) {
      mappedBody.toTokenAddress = mapTokenAddressForLiFi(
        mappedBody.toTokenAddress,
        originalToChainId,
        mappedBody.toChainId
      );
    }
    
    // 获取LI.FI API端点
    const endpoint = request.nextUrl.searchParams.get('endpoint') || 'advanced/routes';
    const apiUrl = `https://li.quest/v1/${endpoint}`;
    
    console.log('LI.FI代理请求:', {
      endpoint,
      apiUrl,
      originalBody: JSON.stringify(body, null, 2).substring(0, 500) + '...',
      mappedBody: JSON.stringify(mappedBody, null, 2).substring(0, 500) + '...'
    });
    
    // 获取API密钥（如果有）
    const apiKey = process.env.LIFI_API_KEY || '';
    
    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // 添加API密钥（如果存在）
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // 添加integrator标识
    headers['x-lifi-integrator'] = 'Nomad-Arc';
    
    // 转发请求到LI.FI API（使用映射后的请求体）
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(mappedBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LI.FI API错误:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: `LI.FI API错误: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }
    
    // 解析响应
    const data = await response.json();
    
    // 返回响应
    return NextResponse.json({
      success: true,
      data
    });
    
  } catch (error: any) {
    console.error('LI.FI代理错误:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '代理请求失败',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET请求处理（用于quote端点和其他需要GET的端点）
 */
export async function GET(request: NextRequest) {
  try {
    const endpoint = request.nextUrl.searchParams.get('endpoint') || 'status';
    const apiUrl = `https://li.quest/v1/${endpoint}`;
    
    // 对于quote端点，需要从查询参数中提取请求参数并应用映射
    if (endpoint === 'quote') {
      // 从查询参数中提取请求参数
      const queryParams = request.nextUrl.searchParams;
      const requestParams: Record<string, any> = {};
      
      // 收集所有查询参数（除了endpoint）
      for (const [key, value] of queryParams.entries()) {
        if (key !== 'endpoint') {
          // 尝试解析JSON值（对于对象类型的参数）
          try {
            requestParams[key] = JSON.parse(value);
          } catch {
            // 如果不是JSON，保持原样
            requestParams[key] = value;
          }
        }
      }
      
      console.log('LI.FI代理GET请求（quote端点）:', {
        endpoint,
        apiUrl,
        requestParams: JSON.stringify(requestParams, null, 2).substring(0, 500) + '...'
      });
      
      // 应用链ID映射
      const mappedParams = { ...requestParams };
      const originalFromChainId = typeof requestParams.fromChain === 'number' ? requestParams.fromChain :
                                  typeof requestParams.fromChain === 'string' ? parseInt(requestParams.fromChain) : undefined;
      const originalToChainId = typeof requestParams.toChain === 'number' ? requestParams.toChain :
                                typeof requestParams.toChain === 'string' ? parseInt(requestParams.toChain) : undefined;
      
      if (typeof mappedParams.fromChain === 'number' || typeof mappedParams.fromChain === 'string') {
        const fromChainId = typeof mappedParams.fromChain === 'string' ? parseInt(mappedParams.fromChain) : mappedParams.fromChain;
        mappedParams.fromChain = mapChainIdForLiFi(fromChainId);
      }
      if (typeof mappedParams.toChain === 'number' || typeof mappedParams.toChain === 'string') {
        const toChainId = typeof mappedParams.toChain === 'string' ? parseInt(mappedParams.toChain) : mappedParams.toChain;
        mappedParams.toChain = mapChainIdForLiFi(toChainId);
      }
      
      // 应用token地址映射
      if (typeof mappedParams.fromToken === 'string' && originalFromChainId !== undefined) {
        mappedParams.fromToken = mapTokenAddressForLiFi(
          mappedParams.fromToken,
          originalFromChainId,
          mappedParams.fromChain
        );
      }
      if (typeof mappedParams.toToken === 'string' && originalToChainId !== undefined) {
        mappedParams.toToken = mapTokenAddressForLiFi(
          mappedParams.toToken,
          originalToChainId,
          mappedParams.toChain
        );
      }
      
      // 构建查询字符串
      const queryString = new URLSearchParams();
      Object.keys(mappedParams).forEach(key => {
        const value = mappedParams[key];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            queryString.append(key, JSON.stringify(value));
          } else {
            queryString.append(key, String(value));
          }
        }
      });
      
      const finalApiUrl = `${apiUrl}?${queryString.toString()}`;
      console.log('LI.FI代理最终API URL:', finalApiUrl);
      
      const apiKey = process.env.LIFI_API_KEY || '';
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      headers['x-lifi-integrator'] = 'Nomad-Arc';
      
      const response = await fetch(finalApiUrl, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('LI.FI API GET错误:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        return NextResponse.json(
          {
            success: false,
            error: `LI.FI API错误: ${response.status} ${response.statusText}`,
            details: errorText
          },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        data
      });
    } else {
      // 对于非quote端点，保持原有逻辑
      console.log('LI.FI代理GET请求:', { endpoint, apiUrl });
      
      const apiKey = process.env.LIFI_API_KEY || '';
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      headers['x-lifi-integrator'] = 'Nomad-Arc';
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('LI.FI API GET错误:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        return NextResponse.json(
          {
            success: false,
            error: `LI.FI API错误: ${response.status} ${response.statusText}`,
            details: errorText
          },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        data
      });
    }
    
  } catch (error: any) {
    console.error('LI.FI代理GET错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '代理请求失败',
        details: error.message
      },
      { status: 500 }
    );
  }
}