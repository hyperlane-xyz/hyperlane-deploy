import { ChainMap, ModuleType, MultisigIsmConfig } from '@hyperlane-xyz/sdk';

export const multisigIsmConfig: ChainMap<MultisigIsmConfig> = {
  // ----------- Your chains here -----------------
  "solana-devnet": {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: [
      '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    ],
  },
  "solana-devnet-1": {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: [
      '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    ],
  },
};
