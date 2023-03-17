import {
  ChainMap,
  buildContracts,
  MultiProvider,
  HyperlaneCore,
  HyperlaneIgp,
  DispatchedMessage,
} from '@hyperlane-xyz/sdk';
import {
  CoreContracts,
  coreFactories,
} from '@hyperlane-xyz/sdk/dist/core/contracts';
import {
  IgpContracts,
  igpFactories,
} from '@hyperlane-xyz/sdk/dist/gas/contracts';
import { utils } from '@hyperlane-xyz/utils';
import { sleep } from '@hyperlane-xyz/utils/dist/src/utils';
import { ethers } from 'ethers';
import yargs from 'yargs';
import {
  assertBalances,
  assertBytes32,
  getMultiProvider,
  mergedContractAddresses,
} from '../src/config';

export function getArgs(multiProvider: MultiProvider) {
  // Only accept chains for which we have both a connection and contract addresses
  const { intersection } = multiProvider.intersect(
    Object.keys(mergedContractAddresses),
  );
  return yargs(process.argv.slice(2))
    .describe('chains', 'chain to send message from')
    .choices('chains', intersection)
    .demandOption('chains')
    .array('chains')
    .describe('key', 'hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .middleware(assertBalances(multiProvider, (argv) => argv.chains)).argv;
}

async function main() {
  const multiProvider = getMultiProvider();
  let { chains, key } = await getArgs(multiProvider);
  const signer = new ethers.Wallet(key);
  multiProvider.setSharedSigner(signer);
  const core = new HyperlaneCore(
    buildContracts(
      mergedContractAddresses,
      coreFactories,
    ) as ChainMap<CoreContracts>,
    multiProvider,
  );
  const igp = new HyperlaneIgp(
    buildContracts(
      mergedContractAddresses,
      igpFactories,
    ) as ChainMap<IgpContracts>,
    multiProvider,
  );
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
        if (!!!recipient) {
          throw new Error(`Unable to find TestRecipient for ${destination}`);
        }
        const messageTx = await mailbox.contract.dispatch(
          destinationDomain,
          utils.addressToBytes32(recipient),
          '0xdeadbeef',
        );
        // Do not use MultiProvider.handleTx() as it will block for chains that
        // only mine blocks on-demand (e.g. anvil, hardhat)
        const messageReceipt = await messageTx.wait();
        const dispatchedMessages = core.getDispatchedMessages(messageReceipt);
        if (dispatchedMessages.length !== 1) continue;
        const dispatchedMessage = dispatchedMessages[0];
        console.log(
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
        console.error(
          `Encountered error sending message from ${origin} to ${destination}`,
        );
        console.error(e);
      }
    }
  }
  while (messages.size > 0) {
    for (const message of messages.values()) {
      const origin = multiProvider.getChainName(message.parsed.origin);
      const destination = multiProvider.getChainName(
        message.parsed.destination,
      );
      const mailbox = core.getContracts(destination).mailbox;
      const delivered = await mailbox.contract.delivered(message.id);
      if (delivered) {
        messages.delete(message);
        console.log(
          `Message from ${origin} to ${destination} with ID ${
            message!.id
          } was delivered`,
        );
      } else {
        console.log(
          `Message from ${origin} to ${destination} with ID ${
            message!.id
          } has not yet been delivered`,
        );
      }
      await sleep(5000);
    }
  }
}

main().then(console.log).catch(console.error);
