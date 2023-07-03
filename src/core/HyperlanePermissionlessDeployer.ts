import { ethers } from 'ethers';
import yargs from 'yargs';

import {
  ChainMap,
  ChainName,
  HyperlaneAddresses,
  HyperlaneAddressesMap,
  HyperlaneContractsMap,
  HyperlaneCoreDeployer,
  HyperlaneIgpDeployer,
  HyperlaneIsmFactory,
  HyperlaneIsmFactoryDeployer,
  MultiProvider,
  defaultMultisigIsmConfigs,
  objFilter,
  objMap,
  objMerge,
  serializeContractsMap,
} from '@hyperlane-xyz/sdk';
import type { DeployedIsm } from '@hyperlane-xyz/sdk/dist/ism/types';

import { multisigIsmConfig } from '../../config/multisig_ism';
import { startBlocks } from '../../config/start_blocks';
import {
  artifactsAddressesMap,
  assertBalances,
  assertBytes32,
  assertUnique,
  buildCoreConfigMap,
  buildIgpConfigMap,
  buildIsmConfigMap,
  buildOverriddenAgentConfig,
  buildTestRecipientConfigMap,
  getMultiProvider,
  sdkContractAddressesMap,
} from '../config';
import { mergeJSON, writeJSON } from '../json';
import { createLogger } from '../logger';

import { HyperlaneTestRecipientDeployer } from './TestRecipientDeployer';

export function getArgs(multiProvider: MultiProvider) {
  // For each chain, we need:
  //   - ChainMetadata for the MultiProvider
  //   - A MultisigIsmConfig
  const { intersection } = multiProvider.intersect(
    Object.keys(objMerge(defaultMultisigIsmConfigs, multisigIsmConfig)),
  );

  return yargs(process.argv.slice(2))
    .describe('local', 'The chain to deploy to')
    .choices('local', intersection)
    .demandOption('local')
    .array('remotes')
    .describe(
      'remotes',
      "The chains with which 'local' will be able to send and receive messages",
    )
    .choices('remotes', intersection)
    .demandOption('remotes')
    .middleware(assertUnique((argv) => argv.remotes.concat(argv.local)))
    .describe('key', 'A hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .middleware(
      assertBalances(multiProvider, (argv) => argv.remotes.concat(argv.local)),
    )
    .describe('write-agent-config', 'Whether or not to write agent config')
    .default('write-agent-config', true)
    .boolean('write-agent-config').argv;
}

export class HyperlanePermissionlessDeployer {
  constructor(
    public readonly multiProvider: MultiProvider,
    public readonly signer: ethers.Signer,
    public readonly local: ChainName,
    public readonly remotes: ChainName[],
    public readonly writeAgentConfig?: boolean,
    protected readonly logger = createLogger('HyperlanePermissionlessDeployer'),
  ) {}

  static async fromArgs(): Promise<HyperlanePermissionlessDeployer> {
    const multiProvider = getMultiProvider();
    const { local, remotes, key, writeAgentConfig } = await getArgs(
      multiProvider,
    );
    if (remotes.includes(local))
      throw new Error('Local and remotes must be distinct');
    const signer = new ethers.Wallet(key);
    multiProvider.setSharedSigner(signer);

    return new HyperlanePermissionlessDeployer(
      multiProvider,
      signer,
      local,
      remotes as unknown as string[],
      writeAgentConfig,
    );
  }

  get chains(): ChainName[] {
    return this.remotes.concat([this.local]);
  }

  async deploy(): Promise<void> {
    let addressesMap = artifactsAddressesMap();
    const owner = await this.signer.getAddress();

    // 1. Deploy ISM factories to all chains that don't have them.
    this.logger('Deploying ISM factory contracts');
    const ismDeployer = new HyperlaneIsmFactoryDeployer(this.multiProvider);
    ismDeployer.cacheAddressesMap(
      objMerge(sdkContractAddressesMap, addressesMap),
    );
    const ismFactoryContracts = await ismDeployer.deploy(this.chains);
    addressesMap = this.writeMergedAddresses(addressesMap, ismFactoryContracts);
    this.logger(`ISM factory deployment complete`);

    // 2. Deploy IGPs to all chains
    this.logger(`Deploying IGP contracts`);
    const igpConfig = buildIgpConfigMap(owner, this.chains);
    const igpDeployer = new HyperlaneIgpDeployer(this.multiProvider);
    igpDeployer.cacheAddressesMap(addressesMap);
    const igpContracts = await igpDeployer.deploy(igpConfig);
    addressesMap = this.writeMergedAddresses(addressesMap, igpContracts);
    this.logger(`IGP deployment complete`);

    // 3. Deploy core contracts to local chain
    this.logger(`Deploying core contracts to ${this.local}`);
    // Build an IsmFactory that covers all chains so that we can
    // use it later to deploy ISMs to remote chains.
    const ismFactory = HyperlaneIsmFactory.fromAddressesMap(
      objMerge(sdkContractAddressesMap, addressesMap),
      this.multiProvider,
    );
    const coreDeployer = new HyperlaneCoreDeployer(
      this.multiProvider,
      ismFactory,
    );
    coreDeployer.cacheAddressesMap(addressesMap);
    const coreConfig = buildCoreConfigMap(owner, this.local, this.remotes);
    const coreContracts = await coreDeployer.deploy(coreConfig);
    addressesMap = this.writeMergedAddresses(addressesMap, coreContracts);
    this.logger(`Core deployment complete`);

    // 4. Deploy ISM contracts to remote chains
    this.logger(`Deploying ISMs to chains: ${this.remotes}`);
    const ismConfigs = buildIsmConfigMap(owner, this.remotes, this.chains);
    const ismContracts: ChainMap<{ interchainSecurityModule: DeployedIsm }> =
      {};
    for (const [ismChain, ismConfig] of Object.entries(ismConfigs)) {
      this.logger(`Deploying ISM to ${ismChain}`);
      ismContracts[ismChain] = {
        interchainSecurityModule: await ismFactory.deploy(ismChain, ismConfig),
      };
    }
    addressesMap = this.writeMergedAddresses(addressesMap, ismContracts);
    this.logger(`ISM deployment complete`);

    // 5. Deploy TestRecipients to all chains
    this.logger(`Deploying test recipient contracts`);
    const testRecipientConfig = buildTestRecipientConfigMap(
      this.chains,
      addressesMap,
    );
    const testRecipientDeployer = new HyperlaneTestRecipientDeployer(
      this.multiProvider,
    );
    testRecipientDeployer.cacheAddressesMap(addressesMap);
    const testRecipients = await testRecipientDeployer.deploy(
      testRecipientConfig,
    );
    addressesMap = this.writeMergedAddresses(addressesMap, testRecipients);
    this.logger(`Test recipient deployment complete`);

    startBlocks[this.local] = await this.multiProvider
      .getProvider(this.local)
      .getBlockNumber();

    if (this.writeAgentConfig) {
      const agentConfig = buildOverriddenAgentConfig(
        this.chains,
        this.multiProvider,
        startBlocks,
      );

      this.logger(`Writing agent config to artifacts/agent_config.json`);
      writeJSON('./artifacts/', 'agent_config.json', agentConfig);
    }
  }

  protected writeMergedAddresses(
    aAddresses: HyperlaneAddressesMap<any>,
    bContracts: HyperlaneContractsMap<any>,
  ): HyperlaneAddressesMap<any> {
    // Only write addresses that aren't present in the SDK
    const bAddresses = serializeContractsMap(bContracts);
    const mergedAddresses = objMerge(aAddresses, bAddresses);
    const filteredAddresses = objMap(
      mergedAddresses,
      (chain: string, addresses) =>
        objFilter(addresses, (contract, address): address is string => {
          // @ts-ignore
          const chainAddresses = sdkContractAddressesMap[chain];
          return !chainAddresses || chainAddresses[contract] !== address;
        }),
    );
    this.logger(`Writing contract addresses to artifacts/addresses.json`);
    mergeJSON(
      './artifacts/',
      'addresses.json',
      objFilter(
        filteredAddresses,
        (_, value): value is HyperlaneAddresses<any> => !!value,
      ),
    );
    return mergedAddresses;
  }
}
