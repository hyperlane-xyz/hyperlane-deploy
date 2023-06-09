import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';

// A map of chain names to ChainMetadata
export const chains: ChainMap<ChainMetadata> = {
  // ----------- Add your chains here -----------------
  anvil1: {
    name: 'anvil1',
    // anvil default chain id
    chainId: 31337,
    // Used to configure a Warp Route to bridge anvil1 ETH
    // to anvil2 in CI tests.
    nativeToken: {
      name: 'ether',
      symbol: 'ETH',
      decimals: 18,
    },
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

  coston2: {
    name: 'coston2',
    chainId: 114,
    nativeToken: {
      name: 'Coston2Flare',
      symbol: 'C2FLR',
      decimals: 18,
    },
    isTestnet: true,
    publicRpcUrls: [
      {
        http: 'https://coston2-api.flare.network/ext/C/rpc',
      },
    ],
  },
};
