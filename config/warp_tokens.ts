import { HypERC20Config, TokenType } from '@hyperlane-xyz/hyperlane-token';
import { ChainMap } from '@hyperlane-xyz/sdk';

// A map of chain name to token configs
// Not required for Hyperlane core deployments
export const warpTokenConfig: ChainMap<HypERC20Config> = {
  goerli: {
    type: TokenType.collateral,
    token: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    // TODO get these from the deployment artifacts
    owner: '0x5bA371aeA18734Cb7195650aFdfCa4f9251aa513',
    mailbox: '0xCC737a94FecaeC165AbCf12dED095BB13F037685',
    interchainGasPaymaster: '0xF90cB82a76492614D07B82a7658917f3aC811Ac1',
  },
  alfajores: {
    type: TokenType.synthetic,
    // TODO get these from the token metadata
    name: 'Weth',
    symbol: 'WETH',
    totalSupply: 0,
    // TODO get these from the deployment artifacts
    owner: '0x5bA371aeA18734Cb7195650aFdfCa4f9251aa513',
    mailbox: '0xCC737a94FecaeC165AbCf12dED095BB13F037685',
    interchainGasPaymaster: '0xF90cB82a76492614D07B82a7658917f3aC811Ac1',
  },
};
