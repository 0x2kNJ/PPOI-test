/**
 * Relayer client utilities for x402
 */

export interface RelayerConfig {
  url: string;
  adapterAddress: string;
}

export interface ExecuteRequest {
  adapter: string;
  method: 'take' | 'redeemToPublic';
  args: any[];
}

/**
 * Execute a transaction via relayer
 */
export async function relayExecute(
  config: RelayerConfig,
  request: ExecuteRequest
): Promise<{ txHash: string; blockNumber?: number }> {
  const response = await fetch(`${config.url}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...request,
      adapter: config.adapterAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Relayer error');
  }

  return response.json();
}

