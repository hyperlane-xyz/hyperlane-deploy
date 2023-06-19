import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';

// A map of chain names to ChainMetadata
export const chains: ChainMap<ChainMetadata> = {
  // ----------- Add your chains here -----------------
  "solana-devnet": {
    name: 'solana-devnet',
    chainId: 13375,
    nativeToken: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
    publicRpcUrls: [
      {
        // Bogus, not used
        http: 'http://localhost:6969',
      },
    ],
  },
  "solana-devnet-1": {
    name: 'solana-devnet-1',
    chainId: 13376,
    nativeToken: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
    publicRpcUrls: [
      {
        // Bogus, not used
        http: 'http://localhost:6969',
      },
    ],
  },
};
