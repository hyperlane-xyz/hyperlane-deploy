import { TokenType } from '@hyperlane-xyz/hyperlane-token';

import type { WarpRouteConfig } from '../src/warp/config';

// A config for deploying Warp Routes to a set of chains
// Not required for Hyperlane core deployments
export const warpRouteConfig: WarpRouteConfig = {
  base: {
    // Chain name must be in the Hyperlane SDK or in the chains.ts config
    chainName: 'bsctestnet',
    type: TokenType.collateral, //  TokenType.native or TokenType.collateral
    // If type is collateral, a token address is required:
    address: '0x64544969ed7EBf5f083679233325356EbE738930'
    // If the token is an NFT (ERC721), set to true:
    // isNft: boolean

    // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
    // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
  },
  synthetics: [
    {
      chainName: 'alfajores',
      type: TokenType.native,
      scale: 10**9

      // Optionally specify a name, symbol, and totalSupply
      // If not specified, the base token's properties will be used

      // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
      // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
    },
  ],
};
