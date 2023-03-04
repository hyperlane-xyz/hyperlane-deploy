import {
  ChainMap,
  CoreContractAddresses,
  MultiProvider,
  HyperlaneCore,
  objMap,
  hyperlaneContractAddresses,
} from '@hyperlane-xyz/sdk';
import { ethers } from 'ethers';
import yargs from 'yargs';
import addresses from '../../artifacts/addresses.json';
import {
  assertBytes32,
  coerceAddressToBytes32,
  getMultiProvider,
} from '../../src/args';

const additionalContractAddresses: ChainMap<CoreContractAddresses> = objMap(
  addresses,
  (_chain, addresses) => ({
    mailbox: {
      kind: addresses.mailbox.kind,
      proxy: addresses.mailbox.proxy,
      implementation: addresses.mailbox.implementation,
    },
    multisigIsm: addresses.multisigIsm,
    interchainGasPaymaster: addresses.interchainGasPaymaster.proxy,
    validatorAnnounce: addresses.validatorAnnounce,
    proxyAdmin: addresses.proxyAdmin,
  }),
);
const allContractAddresses: ChainMap<CoreContractAddresses> = {
  ...hyperlaneContractAddresses,
  ...additionalContractAddresses,
};

export function getArgs(multiProvider: MultiProvider) {
  // Only accept chains for which we have both a connection and contract addresses
  const chains = multiProvider
    .getKnownChainNames()
    .filter((x) => Object.keys(allContractAddresses).includes(x));
  return yargs(process.argv.slice(2))
    .describe('origin', 'chain to send message from')
    .choices('origin', chains)
    .demandOption('origin')
    .describe('destination', 'chain to send message to')
    .choices('destination', chains)
    .demandOption('destination')
    .describe('key', 'hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .describe('recipient', 'recipient address on the destination chain')
    .string('recipient')
    .coerce('recipient', coerceAddressToBytes32)
    .demandOption('recipient').argv;
}

async function main() {
  const multiProvider = getMultiProvider();
  const { origin, destination, key, recipient } = await getArgs(multiProvider);
  const signer = new ethers.Wallet(key, multiProvider.getProvider(origin));
  multiProvider.setSigner(origin, signer);
  const contractAddresses: ChainMap<CoreContractAddresses> = {};
  contractAddresses[origin] = allContractAddresses[origin];
  contractAddresses[destination] = allContractAddresses[destination];
  const core = HyperlaneCore.fromAddresses(contractAddresses, multiProvider);
  try {
    const mailbox = core.getContracts(origin).mailbox;
    const tx = await mailbox.dispatch(
      multiProvider.getDomainId(destination),
      recipient,
      '0xdeadbeef',
    );
    // Do not use MultiProvider.handleTx() as it will block for chains that
    // only mind blocks on-demand (e.g. anvil, hardhat)
    const receipt = await tx.wait();
    const messages = core.getDispatchedMessages(receipt);
    console.log('Message sent with ID:', messages[0].id);
    console.log('Polling for delivery...');
    await core.waitForMessageProcessed(receipt);
  } catch (e) {
    console.error(`Encountered error during message send`);
    console.error(e);
  }
}

main().then(console.log).catch(console.error);
