import { NextRequest, NextResponse } from 'next/server';
import { getDeepSeekClient } from '@/lib/ai/client';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text parameter' },
        { status: 400 }
      );
    }

    // 获取DeepSeek客户端
    const client = getDeepSeekClient();
    
    // 解析意图
    const result = await client.parseIntent(text);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API route error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to parse intent',
        message: error.message,
        intent: null,
        confidence: 0
      },
      { status: 500 }
    );
  }
}

// 添加GET方法用于测试
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Intent parsing API is running',
    endpoint: 'POST /api/parse-intent',
    parameters: {
      text: 'Natural language intent text'
    }
  });
}