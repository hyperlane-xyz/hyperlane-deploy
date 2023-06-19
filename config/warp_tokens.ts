import { TokenType } from '@hyperlane-xyz/hyperlane-token';

import type { WarpRouteConfig } from '../src/warp/config';

// A config for deploying Warp Routes to a set of chains
// Not required for Hyperlane core deployments
export const warpRouteConfig: WarpRouteConfig = {
  base: {
    // Chain name must be in the Hyperlane SDK or in the chains.ts config
    chainName: 'solana-devnet',
    type: TokenType.native, //  TokenType.native or TokenType.collateral
    // If type is collateral, a token address is required:
    // address: '0x123...'

    // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
    // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
    foreignDeployment: '0x7145aabff8e0bf43b50d6ba6857e9d65a59d18ca1960c3846b64564e30e8078e',
  },
  synthetics: [
    {
      chainName: 'solana-devnet-1',

      // Optionally specify a name, symbol, and totalSupply
      // If not specified, the base token's properties will be used

      // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
      // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used

      foreignDeployment: '0x286c8de1a56a13163086730d6fade474e505c5a7f6f58b133c4bb798317cbe21',
    },
    {
      chainName: 'fuji',

      // Optionally specify a name, symbol, and totalSupply
      // If not specified, the base token's properties will be used

      // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
      // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
    },
  ],
};
