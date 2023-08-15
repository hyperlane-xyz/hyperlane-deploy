import { ChainMap, ModuleType, MultisigIsmConfig } from '@hyperlane-xyz/sdk';

export const multisigIsmConfig: ChainMap<MultisigIsmConfig> = {
  // ----------- Your chains here -----------------
  proteustestnet: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 2,
    validators: [
      '0x79fc73656abb9eeaa5ee853c4569124f5bdaf9d8',
      '0x72840388d5ab57323bc4f6e6d3ddedfd5cc911f0',
      '0xd4b2a50c53fc6614bb3cd3198e0fdc03f5da973f',
    ],
  },
  solanadevnet: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 2,
    validators: [
      '0xec0f73dbc5b1962a20f7dcbe07c98414025b0c43',
      '0x9c20a149dfa09ea9f77f5a7ca09ed44f9c025133',
      '0x967c5ecdf2625ae86580bd203b630abaaf85cd62',
    ],
  },
};
