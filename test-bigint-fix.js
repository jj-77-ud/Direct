// 测试 BigInt 序列化修复
console.log('测试 BigInt 序列化修复...');

// 模拟包含 BigInt 的对象
const testObj = {
  name: 'Test Transaction',
  value: BigInt('1000000000000000000'), // 1 ETH in wei
  gasPrice: BigInt('20000000000'),
  gasLimit: BigInt('21000'),
  normalField: '正常字符串',
  nested: {
    amount: BigInt('500000000000000000')
  }
};

// 测试原始的 JSON.stringify（应该会失败）
console.log('\n1. 测试原始的 JSON.stringify:');
try {
  const result = JSON.stringify(testObj, null, 2);
  console.log('✅ 原始 JSON.stringify 成功（不应该发生）:', result.substring(0, 200));
} catch (error) {
  console.log('❌ 原始 JSON.stringify 失败（预期）:', error.message);
}

// 测试带有 replacer 的 JSON.stringify
console.log('\n2. 测试带有 BigInt replacer 的 JSON.stringify:');
const bigIntReplacer = (key, value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

try {
  const result = JSON.stringify(testObj, bigIntReplacer, 2);
  console.log('✅ 带有 replacer 的 JSON.stringify 成功');
  console.log('结果片段:', result.substring(0, 300));
  
  // 验证转换是否正确
  const parsed = JSON.parse(result);
  console.log('\n3. 验证解析结果:');
  console.log('value 类型:', typeof parsed.value, '值:', parsed.value);
  console.log('gasPrice 类型:', typeof parsed.gasPrice, '值:', parsed.gasPrice);
  console.log('nested.amount 类型:', typeof parsed.nested.amount, '值:', parsed.nested.amount);
  
  if (typeof parsed.value === 'string' && parsed.value === '1000000000000000000') {
    console.log('✅ BigInt 正确转换为字符串');
  } else {
    console.log('❌ BigInt 转换不正确');
  }
} catch (error) {
  console.log('❌ 带有 replacer 的 JSON.stringify 失败:', error);
}

// 测试 safeStringify 方法（模拟）
console.log('\n4. 测试 safeStringify 方法:');
class TestClass {
  bigIntReplacer(key, value) {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }
  
  safeStringify(obj, indent) {
    return JSON.stringify(obj, this.bigIntReplacer.bind(this), indent);
  }
}

const testInstance = new TestClass();
try {
  const result = testInstance.safeStringify(testObj, 2);
  console.log('✅ safeStringify 成功');
  console.log('结果验证:', result.includes('"1000000000000000000"') ? '包含转换后的 BigInt' : '错误');
} catch (error) {
  console.log('❌ safeStringify 失败:', error);
}

console.log('\n测试完成！');