import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';

export const chains: ChainMap<ChainMetadata> = {
  local: {
    name: 'local',
    chainId: 1234,
    publicRpcUrls: [
      {
        http: 'http://localhost:8545',
      },
    ],
  },
};
