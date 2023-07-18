import { ChainMap, ModuleType, MultisigIsmConfig } from '@hyperlane-xyz/sdk';

export const multisigIsmConfig: ChainMap<MultisigIsmConfig> = {
  // ----------- Your chains here -----------------
  mitosis: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: ['0x594D0C5F2ba861214C74314eF4b0927A5E6f0Cb9'],
  },
  anvil1: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: ['0x594D0C5F2ba861214C74314eF4b0927A5E6f0Cb9'],
  },
  anvil2: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: ['0x594D0C5F2ba861214C74314eF4b0927A5E6f0Cb9'],
  },
};
