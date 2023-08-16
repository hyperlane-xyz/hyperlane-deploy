import { TokenType } from '@hyperlane-xyz/hyperlane-token';

import type { WarpRouteConfig } from '../src/warp/config';

// A config for deploying Warp Routes to a set of chains
// Not required for Hyperlane core deployments
export const warpRouteConfig: WarpRouteConfig = {
  base: {
    // Chain name must be in the Hyperlane SDK or in the chains.ts config
    chainName: 'bsc',
    type: TokenType.collateral, //  TokenType.native or TokenType.collateral
    // If type is collateral, a token address is required:
    address: '0x37a56cdcD83Dce2868f721De58cB3830C44C6303',
    // If the token is an NFT (ERC721), set to true:
    // isNft: boolean

    // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
    // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
  },
  synthetics: [
    {
      chainName: 'nautilus',
      type: TokenType.native,
      scale: 10**9,

      // Optionally specify a name, symbol, and totalSupply
      // If not specified, the base token's properties will be used

      // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
      // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
    },
    {
      chainName: 'solana',
      type: TokenType.collateral,
      address: '0x0000000000000000000000000000000000000000',
      name: 'Zebec',
      symbol: 'ZBC',
      decimals: 9,
      foreignDeployment: '0xc5ba229fa2822fe65ac2bd0a93d8371d75292c3415dd381923c1088a3308528b',
    }
  ],
};
