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
    validators: [
      // Last anvil address
      '0x3a4c9ad12b4daF20ae4635F9c2C0a03af583558a',
    ],
  },
  anvil2: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: [
      // Last anvil address
      '0x3a4c9ad12b4daF20ae4635F9c2C0a03af583558a',
    ],
  },
};
