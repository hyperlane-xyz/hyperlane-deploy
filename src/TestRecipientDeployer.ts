import { TestRecipient, TestRecipient__factory } from '@hyperlane-xyz/core';
import {
  ChainMap,
  ChainName,
  HyperlaneDeployer,
  MultiProvider,
} from '@hyperlane-xyz/sdk';
import { debug, types } from '@hyperlane-xyz/utils';

// Maps chain name to ISM address
export type TestRecipientConfig = {
  ism: types.Address;
};

export type TestRecipientContracts = {
  testRecipient: TestRecipient;
};

export type TestRecipientAddresses = {
  testRecipient: types.Address;
};

export const testRecipientFactories = {
  testRecipient: new TestRecipient__factory(),
};

export class HyperlaneTestRecipientDeployer extends HyperlaneDeployer<
  TestRecipientConfig,
  TestRecipientContracts,
  typeof testRecipientFactories
> {
  constructor(
    multiProvider: MultiProvider,
    configMap: ChainMap<TestRecipientConfig>,
    factoriesOverride = testRecipientFactories,
  ) {
    super(multiProvider, configMap, factoriesOverride, {
      logger: debug('hyperlane:TestRecipientDeployer'),
    });
  }

  async deployContracts(
    chain: ChainName,
    config: TestRecipientConfig,
  ): Promise<TestRecipientContracts> {
    const testRecipient = await this.deployContract(chain, 'testRecipient', []);
    const tx = testRecipient.setInterchainSecurityModule(config.ism);
    await this.multiProvider.handleTx(chain, tx);
    return {
      testRecipient,
    };
  }
}
