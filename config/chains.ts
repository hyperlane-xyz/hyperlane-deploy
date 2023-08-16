import { ChainMap, ChainMetadata, ProtocolType } from '@hyperlane-xyz/sdk';

// import { chainMetadata } from '@hyperlane-xyz/sdk';
// A map of chain names to ChainMetadata
export const chains: ChainMap<ChainMetadata> = {
  nautilus: {
    chainId: 22222,
    domainId: 22222,
    name: 'nautilus',
    protocol: ProtocolType.Ethereum,
    displayName: 'Nautilus',
    nativeToken: {
      name: 'Zebec',
      symbol: 'ZBC',
      decimals: 18,
    },
    rpcUrls: [
      {
        http: 'https://api.nautilus.nautchain.xyz',
      },
    ],
    blocks: {
      confirmations: 1,
      reorgPeriod: 1,
      estimateBlockTime: 1,
    },
  },

  solana: {
    protocol: ProtocolType.Sealevel,
    // Uses the same ChainId as https://www.alchemy.com/chain-connect/chain/solana
    chainId: 1399811149,
    domainId: 1399811149,
    name: 'solana',
    displayName: 'Solana',
    nativeToken: { name: 'Sol', symbol: 'SOL', decimals: 9 },
    rpcUrls: [{ http: 'https://api.mainnet-beta.solana.com' }],
    // blockExplorers: [
    //   {
    //     name: 'SolScan',
    //     url: 'https://solscan.io',
    //     apiUrl: 'https://public-api.solscan.io',
    //     family: ExplorerFamily.Other,
    //   },
    // ],
    blocks: {
      confirmations: 1,
      reorgPeriod: 0,
      estimateBlockTime: 0.4,
    },
  },

  // --------------------------------------------------
  // You can also override the default chain metadata (completely)
  // ethereum: {
  //   ...chainMetadata.ethereum,
  //   publicRpcUrls: [
  //     {
  //       http: 'my.custom.rpc.url',
  //     }
  //   ],
  // }
};
