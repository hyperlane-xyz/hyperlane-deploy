import { ChainMap, ModuleType, MultisigIsmConfig } from '@hyperlane-xyz/sdk';

export const multisigIsmConfig: ChainMap<MultisigIsmConfig> = {
  // ----------- Your chains here -----------------
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
