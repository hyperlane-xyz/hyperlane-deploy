import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';

// A map of chain names to ChainMetadata
export const chains: ChainMap<ChainMetadata> = {
  // ----------- Add your chains here -----------------
  anvil: {
    name: 'anvil',
    // anvil default chain id
    chainId: 31337,
    publicRpcUrls: [
      {
        http: 'http://127.0.0.1:8545',
      },
    ],
  },
};
