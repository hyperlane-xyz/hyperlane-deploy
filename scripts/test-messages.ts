import { ethers } from 'ethers';
import yargs from 'yargs';

import {
  CoreFactories,
  DispatchedMessage,
  HyperlaneAddressesMap,
  HyperlaneApp,
  HyperlaneCore,
  HyperlaneIgp,
  MultiProvider,
  coreFactories,
} from '@hyperlane-xyz/sdk';
import {
  IgpFactories,
  igpFactories,
} from '@hyperlane-xyz/sdk/dist/gas/contracts';
import { utils } from '@hyperlane-xyz/utils';
import { sleep } from '@hyperlane-xyz/utils/dist/src/utils';

import {
  assertBalances,
  assertBytes32,
  assertUnique,
  getMultiProvider,
  mergedContractAddresses,
} from '../src/config';
import { createLogger } from '../src/logger';

import { run } from './run';

const logger = createLogger('MessageDeliveryTest');
const error = createLogger('MessageDeliveryTest', true);

function getArgs(multiProvider: MultiProvider) {
  // Only accept chains for which we have both a connection and contract addresses
  const { intersection } = multiProvider.intersect(
    Object.keys(mergedContractAddresses),
  );
  return yargs(process.argv.slice(2))
    .describe('chains', 'chain to send message from')
    .choices('chains', intersection)
    .demandOption('chains')
    .array('chains')
    .middleware(assertUnique((argv) => argv.chains))
    .describe('key', 'hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .describe('timeout', 'timeout in seconds')
    .number('timeout')
    .default('timeout', 10 * 60)
    .middleware(assertBalances(multiProvider, (argv) => argv.chains)).argv;
}

function coreFromAddressesMap(
  addressesMap: HyperlaneAddressesMap<CoreFactories>,
  _multiProvider: MultiProvider,
): HyperlaneCore {
  const { contractsMap, multiProvider } = HyperlaneApp.fromAddressesMap(
    addressesMap,
    coreFactories,
    _multiProvider,
  );
  return new HyperlaneCore(contractsMap, multiProvider);
}

function igpFromAddressesMap(
  addressesMap: HyperlaneAddressesMap<IgpFactories>,
  _multiProvider: MultiProvider,
): HyperlaneIgp {
  const { contractsMap, multiProvider } = HyperlaneApp.fromAddressesMap(
    addressesMap,
    igpFactories,
    _multiProvider,
  );
  return new HyperlaneIgp(contractsMap, multiProvider);
}

run('Message delivery test', async () => {
  let timedOut = false;
  const multiProvider = getMultiProvider();
  const { chains, key, timeout } = await getArgs(multiProvider);
  const timeoutId = setTimeout(() => {
    timedOut = true;
  }, timeout * 1000);
  const signer = new ethers.Wallet(key);
  multiProvider.setSharedSigner(signer);
  const core = coreFromAddressesMap(mergedContractAddresses, multiProvider);
  const igp = igpFromAddressesMap(mergedContractAddresses, multiProvider);
  const messages: Set<DispatchedMessage> = new Set();
  for (const origin of chains) {
    const mailbox = core.getContracts(origin).mailbox;
    const defaultIgp =
      igp.getContracts(origin).defaultIsmInterchainGasPaymaster;
    for (const destination of chains) {
      const destinationDomain = multiProvider.getDomainId(destination);
      if (origin === destination) continue;
      try {
        const recipient = mergedContractAddresses[destination]
          .testRecipient as string;
        if (!recipient) {
          throw new Error(`Unable to find TestRecipient for ${destination}`);
        }
        const messageTx = await mailbox.dispatch(
          destinationDomain,
          utils.addressToBytes32(recipient),
          '0xdeadbeef',
        );
        const messageReceipt = await multiProvider.handleTx(origin, messageTx);
        const dispatchedMessages = core.getDispatchedMessages(messageReceipt);
        if (dispatchedMessages.length !== 1) continue;
        const dispatchedMessage = dispatchedMessages[0];
        logger(
          `Sent message from ${origin} to ${recipient} on ${destination} with message ID ${dispatchedMessage.id}`,
        );
        // Make gas payment...
        const gasAmount = 100_000;
        const value = await defaultIgp.quoteGasPayment(
          destinationDomain,
          gasAmount,
        );
        const paymentTx = await defaultIgp.payForGas(
          dispatchedMessage.id,
          destinationDomain,
          gasAmount,
          await multiProvider.getSignerAddress(origin),
          { value },
        );
        await paymentTx.wait();
        messages.add(dispatchedMessage);
      } catch (e) {
        error(
          `Encountered error sending message from ${origin} to ${destination}`,
        );
        error(e);
      }
    }
  }
  while (messages.size > 0 && !timedOut) {
    for (const message of messages.values()) {
      const origin = multiProvider.getChainName(message.parsed.origin);
      const destination = multiProvider.getChainName(
        message.parsed.destination,
      );
      const mailbox = core.getContracts(destination).mailbox;
      const delivered = await mailbox.delivered(message.id);
      if (delivered) {
        messages.delete(message);
        logger(
          `Message from ${origin} to ${destination} with ID ${
            message!.id
          } was delivered`,
        );
      } else {
        logger(
          `Message from ${origin} to ${destination} with ID ${
            message!.id
          } has not yet been delivered`,
        );
      }
      await sleep(5000);
    }
  }
  clearTimeout(timeoutId);
  if (timedOut) {
    error('Timed out waiting for messages to be delivered');
    process.exit(1);
  }
});
