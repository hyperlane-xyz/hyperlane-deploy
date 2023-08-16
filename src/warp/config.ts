import { z } from 'zod';

import { NativeConfig, TokenType } from '@hyperlane-xyz/hyperlane-token';
import { RouterConfig } from '@hyperlane-xyz/sdk/dist/router/types';

import { MinimalTokenMetadata } from './types';

type WarpBaseToken = {
  chainName: string;
} & Partial<RouterConfig> &
  Partial<MinimalTokenMetadata>;

export interface WarpNativeTokenConfig extends WarpBaseToken, NativeConfig {}

export interface WarpCollateralTokenConfig extends WarpBaseToken {
  type: TokenType.collateral;
  address: string;
  isNft?: boolean;
}

export type WarpSyntheticTokenConfig = {
  chainName: string;
  totalSupply?: number;
} & Partial<RouterConfig> &
  Partial<MinimalTokenMetadata>;

export type WarpBaseTokenConfig =
  | WarpNativeTokenConfig
  | WarpCollateralTokenConfig;

export interface SyntheticNativeTokenConfig extends WarpSyntheticTokenConfig {
  type: TokenType.native;
}

export interface SyntheticCollateralTokenConfig extends WarpSyntheticTokenConfig {
  type: TokenType.collateral;
  address: string;
  isNft?: boolean;
}

export interface SyntheticTokenConfig extends WarpSyntheticTokenConfig {
  type: TokenType.synthetic;
}

export type RemoteWarpTokenConfig = SyntheticNativeTokenConfig | SyntheticCollateralTokenConfig | SyntheticTokenConfig;

export interface WarpRouteConfig {
  base: WarpBaseTokenConfig;
  synthetics: RemoteWarpTokenConfig[];
}

// Zod schema for Warp Route config validation validation
const ConnectionConfigSchema = {
  mailbox: z.string().optional(),
  interchainGasPaymaster: z.string().optional(),
  interchainSecurityModule: z.string().optional(),
};

export const WarpTokenConfigSchema = z.object({
  base: z.object({
    type: z.literal(TokenType.native).or(z.literal(TokenType.collateral)),
    chainName: z.string(),
    address: z.string().optional(),
    isNft: z.boolean().optional(),
    ...ConnectionConfigSchema,
  }),
  synthetics: z
    .array(
      z.object({
        chainName: z.string(),
        name: z.string().optional(),
        symbol: z.string().optional(),
        totalSupply: z.number().optional(),
        ...ConnectionConfigSchema,
      }),
    )
    .nonempty(),
});

export function validateWarpTokenConfig(data: WarpRouteConfig) {
  const result = WarpTokenConfigSchema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(
      `Invalid warp config: ${firstIssue.path} => ${firstIssue.message}`,
    );
  }
}

export function getWarpConfigChains(config: WarpRouteConfig) {
  const { base, synthetics } = config;
  return [base, ...synthetics]
    .filter((c) => !c.foreignDeployment)
    .map((token) => token.chainName);
}
