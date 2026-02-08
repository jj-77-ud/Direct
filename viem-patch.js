// 补齐之前缺失的 viem 导出
export const getCallsStatus = () => {};
export const getCapabilities = () => {};
export const sendCalls = () => {};
export const sendCallsSync = () => {};
export const sendTransactionSync = () => {};

// 伪造 MetaMaskSDK 类防止运行时报错
export class MetaMaskSDK {
  constructor() {
    this.connect = () => Promise.resolve();
    this.getProvider = () => (typeof window !== 'undefined' ? window.ethereum : null);
  }
}

// 同时提供默认导出和命名导出以兼容不同导入方式
export default { MetaMaskSDK };