import type { TokenType } from '@hyperlane-xyz/hyperlane-token';
// TODO get properly exported from hyp-token
import type { types } from '@hyperlane-xyz/utils';
import { ethers } from 'ethers';

export type TokenMetadata = {
  name: string;
  symbol: string;
  totalSupply?: ethers.BigNumberish;
  decimals?: number;
};

// Types below must match the warp ui token config schema
// https://github.com/hyperlane-xyz/hyperlane-warp-ui-template/blob/main/src/features/tokens/types.ts
interface BaseWarpUITokenConfig extends TokenMetadata {
  type: TokenType.collateral | TokenType.native;
  chainId: number;
  logoURI?: string;
}

interface CollateralTokenConfig extends BaseWarpUITokenConfig {
  type: TokenType.collateral;
  address: types.Address;
  hypCollateralAddress: types.Address;
}

interface NativeTokenConfig extends BaseWarpUITokenConfig {
  type: TokenType.native;
  hypNativeAddress: types.Address;
}

export type WarpUITokenConfig = CollateralTokenConfig | NativeTokenConfig;
