import { TokenConfig, TokenType } from '@hyperlane-xyz/hyperlane-token';
import { ChainMap } from '@hyperlane-xyz/sdk';

// A map of chain name to token configs
// Not required for Hyperlane core deployments
export const warpTokenConfig: ChainMap<TokenConfig> = {
  anvil1: {
    // Type for origin chain is TokenType.native or TokenType.collateral
    type: TokenType.native,
    // If type is collateral, address is required:
    // token: '0x123...'
  },
  anvil2: {
    type: TokenType.synthetic,
    name: 'Weth',
    symbol: 'WETH',
    totalSupply: 0,
  },
};
