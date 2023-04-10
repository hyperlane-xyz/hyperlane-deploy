import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';

// A map of chain names to ChainMetadata
export const chains: ChainMap<ChainMetadata> = {
  // ----------- Add your chains here -----------------
  anvil1: {
    name: 'anvil1',
    // anvil default chain id
    chainId: 31337,
    publicRpcUrls: [
      {
        http: 'http://127.0.0.1:8545',
      },
    ],
  },
  anvil2: {
    name: 'anvil2',
    chainId: 31338,
    publicRpcUrls: [
      {
        http: 'http://127.0.0.1:8555',
      },
    ],
  },
};
