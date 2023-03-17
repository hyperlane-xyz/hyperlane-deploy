import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';

export const chains: ChainMap<ChainMetadata> = {
  anvil: {
    name: 'anvil',
    // anvil default chain id
    chainId: 31337,
    publicRpcUrls: [
      {
        http: 'http://localhost:8545',
      },
    ],
  },
  // Add your chain(s) here
  anvil2: {
    name: 'anvil2',
    // anvil default chain id
    chainId: 1234,
    publicRpcUrls: [
      {
        http: 'http://localhost:8555',
      },
    ],
  },
};
