import { ChainMap, ChainMetadata, ProtocolType } from '@hyperlane-xyz/sdk';

// import { chainMetadata } from '@hyperlane-xyz/sdk';
// A map of chain names to ChainMetadata
export const chains: ChainMap<ChainMetadata> = {
  // ----------- Add your chains here -----------------
  mitosis: {
    name: 'mitosis',
    protocol: ProtocolType.Ethereum,
    chainId: 26657,
    rpcUrls: [
      {
        http: 'http://127.0.0.1:8545',
      },
    ],
  },
  anvil1: {
    name: 'anvil1',
    protocol: ProtocolType.Ethereum,
    chainId: 31338,
    // nativeToken: {
    //   name: 'ether',
    //   symbol: 'ETH',
    //   decimals: 18,
    // },
    rpcUrls: [
      {
        http: 'http://127.0.0.1:8546',
      },
    ],
  },
  anvil2: {
    name: 'anvil2',
    protocol: ProtocolType.Ethereum,
    chainId: 31339,
    rpcUrls: [
      {
        http: 'http://127.0.0.1:8547',
      },
    ],
  },
};
