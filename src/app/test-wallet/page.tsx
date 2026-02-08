'use client';

import React, { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { WalletConnectButton } from '@/components/ui/wallet-connect-button';
import { useSimpleWalletConnect } from '@/hooks/use-wallet-connect';
import { Check, X, AlertCircle, Zap, Wallet, ExternalLink } from 'lucide-react';

export default function WalletTestPage() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, disconnect, isConnecting, error } = useSimpleWalletConnect();
  const [testResults, setTestResults] = useState<Array<{ test: string; passed: boolean; message: string }>>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runWalletTests = async () => {
    setIsTesting(true);
    const results = [];

    // Test 1: Check if wallet provider exists
    if (typeof window !== 'undefined' && window.ethereum) {
      results.push({
        test: 'Wallet Provider Detection',
        passed: true,
        message: 'Wallet provider detected (e.g., MetaMask, Coinbase Wallet, etc.)'
      });
    } else {
      results.push({
        test: 'Wallet Provider Detection',
        passed: false,
        message: 'No wallet provider detected. Please install MetaMask or another Web3 wallet.'
      });
    }

    // Test 2: Check WalletConnect configuration
    const wcProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
    if (wcProjectId && wcProjectId.length > 10) {
      results.push({
        test: 'WalletConnect Configuration',
        passed: true,
        message: 'WalletConnect project ID is properly configured'
      });
    } else {
      results.push({
        test: 'WalletConnect Configuration',
        passed: false,
        message: 'WalletConnect project ID is not properly configured or is a demo ID'
      });
    }

    // Test 3: Check RPC configuration
    const hasRpcConfig = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC &&
                        process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC;
    if (hasRpcConfig) {
      results.push({
        test: 'RPC Endpoint Configuration',
        passed: true,
        message: 'RPC endpoints are properly configured'
      });
    } else {
      results.push({
        test: 'RPC Endpoint Configuration',
        passed: false,
        message: 'RPC endpoints are not fully configured'
      });
    }

    // Test 4: Attempt connection (if not connected)
    if (!isConnected) {
      try {
        // Attempt auto-connection
        const success = await connect();
        if (success) {
          results.push({
            test: 'Wallet Connection Test',
            passed: true,
            message: 'Wallet connected successfully'
          });
        } else {
          results.push({
            test: 'Wallet Connection Test',
            passed: false,
            message: 'Wallet connection failed, user may have canceled'
          });
        }
      } catch (err) {
        results.push({
          test: 'Wallet Connection Test',
          passed: false,
          message: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
      }
    } else {
      results.push({
        test: 'Wallet Connection Test',
        passed: true,
        message: 'Wallet already connected'
      });
    }

    // Test 5: Check chain ID
    if (chainId) {
      results.push({
        test: 'Network Connection',
        passed: true,
        message: `Connected to chain ID: ${chainId}`
      });
    } else if (isConnected) {
      results.push({
        test: 'Network Connection',
        passed: false,
        message: 'Connected but no chain ID detected'
      });
    } else {
      results.push({
        test: 'Network Connection',
        passed: false,
        message: 'Not connected to any network'
      });
    }

    setTestResults(results);
    setIsTesting(false);
  };

  const resetTests = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-tech-dark text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Wallet Connection Test Page</h1>
          <p className="text-gray-400">
            This page demonstrates real wallet connection functionality with no simulated data.
            Click the "Run Wallet Tests" button to verify your wallet connection.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Wallet Status Card */}
          <div className="ai-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet Status
            </h2>
             
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Connection Status:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>

              {address && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Wallet Address:</span>
                  <span className="font-mono text-sm bg-tech-gray px-2 py-1 rounded">
                    {`${address.slice(0, 6)}...${address.slice(-4)}`}
                  </span>
                </div>
              )}

              {chainId && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Network:</span>
                  <span className="text-ai-blue">Chain ID: {chainId}</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-400">Error</div>
                      <div className="text-sm text-red-300">{error.message}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-tech-gray">
              <h3 className="text-lg font-semibold mb-3">Connection Options</h3>
              <div className="space-y-3">
                <WalletConnectButton
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  onConnect={(addr) => console.log('Connected:', addr)}
                  onError={(err) => console.error('Connection error:', err)}
                />
                 
                {isConnected && (
                  <button
                    onClick={disconnect}
                    className="w-full py-3 px-4 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium"
                  >
                    Disconnect Wallet
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Test Results Card */}
          <div className="ai-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Connection Tests
            </h2>

            <div className="mb-6">
              <p className="text-gray-400 mb-4">
                Run the following tests to verify your wallet connection configuration and functionality.
                These tests will check wallet provider, network connection, and configuration.
              </p>
               
              <div className="flex gap-3">
                <button
                  onClick={runWalletTests}
                  disabled={isTesting}
                  className="flex-1 py-3 px-4 rounded-xl bg-ai-blue text-white hover:bg-ai-blue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? 'Testing...' : 'Run Wallet Tests'}
                </button>
                 
                <button
                  onClick={resetTests}
                  className="py-3 px-4 rounded-xl bg-tech-gray text-gray-300 hover:bg-tech-light transition-colors font-medium"
                >
                  Reset Tests
                </button>
              </div>
            </div>

            {testResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Test Results</h3>
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.passed
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )}
                        <span className="font-medium">{result.test}</span>
                      </div>
                      <span className={`text-sm ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {result.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2 ml-6">{result.message}</p>
                  </div>
                ))}
                 
                {/* Summary */}
                <div className="mt-4 p-4 rounded-lg bg-tech-gray">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Test Summary</span>
                    <span className="text-ai-blue">
                      {testResults.filter(r => r.passed).length} / {testResults.length} Passed
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {testResults.filter(r => r.passed).length === testResults.length
                      ? 'All tests passed! Your wallet connection is properly configured.'
                      : 'Some tests failed. Please check your wallet installation and configuration.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="ai-card p-6">
          <h2 className="text-xl font-semibold mb-4">Real Wallet Connection Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-ai-blue">Implemented Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Automatic detection of installed wallet extensions (MetaMask, Coinbase Wallet, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Real WalletConnect integration (supports QR code scanning)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Auto-reconnect to last used wallet</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Multi-chain support (Arbitrum Sepolia, Base Sepolia, Sepolia)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Real RPC connections (using Infura nodes)</span>
                </li>
              </ul>
            </div>
             
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-ai-blue">Testing Steps</h3>
              <ol className="space-y-2 text-gray-300 list-decimal list-inside">
                <li>Ensure you have a Web3 wallet installed (e.g., MetaMask)</li>
                <li>Click the "Connect Wallet" button</li>
                <li>Authorize the connection in the wallet popup</li>
                <li>Run tests to verify connection status</li>
                <li>Check test results to ensure all functionality works</li>
              </ol>
               
              <div className="mt-4 p-3 rounded-lg bg-ai-blue/10 border border-ai-blue/20">
                <p className="text-sm text-ai-blue">
                  <strong>Note:</strong> This is a real wallet connection implementation, not a mock button.
                  Clicking connect will trigger real wallet plugin interaction, requiring you to confirm with your password.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Return to <a href="/" className="text-ai-blue hover:underline">homepage</a> to see full application features.</p>
        </div>
      </div>
    </div>
  );
}