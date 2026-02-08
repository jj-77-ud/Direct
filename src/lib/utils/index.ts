import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名的工具函数
 * 使用 clsx 处理条件类名，使用 tailwind-merge 合并冲突的类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化地址：显示前6位和后4位
 */
export function formatAddress(address: string, start = 6, end = 4): string {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * 格式化金额：添加千位分隔符
 */
export function formatAmount(amount: number | string, decimals = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * 缩短文本
 */
export function shortenText(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}