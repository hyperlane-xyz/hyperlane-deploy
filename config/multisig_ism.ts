import { ChainMap, ModuleType, MultisigIsmConfig } from '@hyperlane-xyz/sdk';

export const multisigIsmConfig: ChainMap<MultisigIsmConfig> = {
  // ----------- Your chains here -----------------
  mitosis: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: [
      // '0x594D0C5F2ba861214C74314eF4b0927A5E6f0Cb9'
      // '0x4B0a1a38A14BbB74AE6a63d7eff65470557a498d',
      'mito1t9xschet4psjznr5x980fvyj0f0x7r9em3q7e4',
    ],
  },
  anvil1: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: [
      // Last anvil address
      '0x26bd6c9FE7765A796F33A190a480272ea14eeab0',
    ],
  },
  anvil2: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: [
      // Last anvil address
      '0x26bd6c9FE7765A796F33A190a480272ea14eeab0',
    ],
  },
};
