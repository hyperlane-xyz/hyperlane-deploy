import { TokenType } from '@hyperlane-xyz/hyperlane-token';

import type { WarpRouteConfig } from '../src/warp/config';

// A config for deploying Warp Routes to a set of chains
// Not required for Hyperlane core deployments
export const warpRouteConfig: WarpRouteConfig = {
  base: {
    // Chain name must be in the Hyperlane SDK or in the chains.ts config
    chainName: 'anvil1',
    type: TokenType.native, //  TokenType.native or TokenType.collateral
    // If type is collateral, a token address is required:
    // address: '0x123...'

    // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
    // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
    existingDeployment: '0xff00000000000000000000000000000000000011',
    mailbox: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    interchainGasPaymaster: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    interchainSecurityModule: '0x0000000000000000000000000000000000000000',
  },
  synthetics: [
    {
      chainName: 'anvil2',

      // Optionally specify a name, symbol, and totalSupply
      // If not specified, the base token's properties will be used

      // Optionally, specify owner, mailbox, and interchainGasPaymaster addresses
      // If not specified, the Permissionless Deployment artifacts or the SDK's defaults will be used
      mailbox: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      interchainGasPaymaster: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      interchainSecurityModule: '0x0000000000000000000000000000000000000000',
    },
  ],
};
