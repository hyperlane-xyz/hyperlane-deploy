import { z } from 'zod';

import { TokenType } from '@hyperlane-xyz/hyperlane-token';
import { ConnectionClientConfig } from '@hyperlane-xyz/sdk/dist/router/types';

type WarpBaseToken = {
  type: TokenType.native | TokenType.collateral;
  chainName: string;
} & Partial<ConnectionClientConfig>;

export interface WarpNativeTokenConfig extends WarpBaseToken {
  type: TokenType.native;
}

export interface WarpCollateralTokenConfig extends WarpBaseToken {
  type: TokenType.collateral;
  address: string;
}

export type WarpSyntheticTokenConfig = {
  chainName: string;
  name?: string;
  symbol?: string;
  totalSupply?: number;
} & Partial<ConnectionClientConfig>;

export type WarpBaseTokenConfig =
  | WarpNativeTokenConfig
  | WarpCollateralTokenConfig;

export interface WarpRouteConfig {
  base: WarpBaseTokenConfig;
  synthetics: WarpSyntheticTokenConfig[];
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
  return [base, ...synthetics].map((token) => token.chainName);
}
