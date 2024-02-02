import { ChainMap, ModuleType, MultisigIsmConfig } from '@hyperlane-xyz/sdk';

export const multisigIsmConfig: ChainMap<MultisigIsmConfig> = {
  // ----------- Your chains here -----------------
  solana: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 2,
    validators: [
      '0x3cd1a081f38874bbb075bf10b62adcb858db864c',
      '0x28aa072634dd41d19471640237852e807bd9901f',
      '0x8a93ba04f4e30064660670cb581d9aa10df78929',
    ],
  },
  nautilus: {
    type: ModuleType.LEGACY_MULTISIG,
    threshold: 2,
    validators: [
      '0x9c920af9467595a23cb3433adefc3854d498a437',
      '0x12b583ce1623b7de3fc727ccccda24dcab1fe022',
      '0xc8b996a421ff1e203070c709c1af93944c049cc0',
    ],
  },
};
