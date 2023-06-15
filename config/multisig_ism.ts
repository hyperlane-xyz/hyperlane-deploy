import { ChainMap, ModuleType, MultisigIsmConfig } from '@hyperlane-xyz/sdk';

export const multisigIsmConfig: ChainMap<MultisigIsmConfig> = {
  // ----------- Your chains here -----------------
  anvil1: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: [
      // Last anvil address
      '0xa0ee7a142d267c1f36714e4a8f75612f20a79720',
    ],
  },
  anvil2: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 1,
    validators: [
      // Second to last anvil address
      '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    ],
  },
};
