import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';

export const chains: ChainMap<ChainMetadata> = {
  // ----------- Your chains here -----------------
  anvil: {
    name: 'anvil1',
    // anvil default chain id
    chainId: 31337,
    publicRpcUrls: [
      {
        http: 'http://localhost:8545',
      },
    ],
  },
  anvil2: {
    name: 'anvil2',
    chainId: 31338,
    publicRpcUrls: [
      {
        http: 'http://localhost:8555',
      },
    ],
  },
};
