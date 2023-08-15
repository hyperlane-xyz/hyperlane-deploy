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
    address: '0x64544969ed7ebf5f083679233325356ebe738930',
    // If the token is an NFT (ERC721), set to true:
    // isNft: boolean

    // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
    // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
  },
  synthetics: [
    {
      chainName: 'proteustestnet',

      type: TokenType.native,

      // Optionally specify a name, symbol, and totalSupply
      // If not specified, the base token's properties will be used

      // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
      // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
    },
    {
      chainName: 'solanadevnet',
      type: TokenType.collateral,
      address: '0x64544969ed7ebf5f083679233325356ebe738930',
      name: 'DUMMY',
      symbol: 'DUMMY',
      decimals: 6,
      foreignDeployment: '0x05b6502b1d91c60ca0c0d0ab20a16ec40c66f2559becc7888a4fc3c0cefff9a5',
    }
  ],
};
