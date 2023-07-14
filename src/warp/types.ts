import type { TokenType } from '@hyperlane-xyz/hyperlane-token';
// TODO get properly exported from hyp-token
import { ERC20Metadata } from '@hyperlane-xyz/hyperlane-token/dist/config';
import type { types } from '@hyperlane-xyz/utils';

export type MinimalTokenMetadata = Omit<ERC20Metadata, 'totalSupply'>;

// Types below must match the Warp UI token config schema
// It is used to generate the configs for the Warp UI
// https://github.com/hyperlane-xyz/hyperlane-warp-ui-template/blob/main/src/features/tokens/types.ts
interface BaseWarpUITokenConfig extends MinimalTokenMetadata {
  type: TokenType.collateral | TokenType.native;
  chainId: number;
  logoURI?: string;
  isNft?: boolean;
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
