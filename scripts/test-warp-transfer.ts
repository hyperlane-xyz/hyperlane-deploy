import {
  ERC20__factory,
  HypERC20,
  HypERC20App,
  HypERC20Collateral,
  HypERC20Collateral__factory,
  HypERC20__factory,
  HypNative,
  HypNative__factory,
  TokenType,
} from '@hyperlane-xyz/hyperlane-token';
import {
  ChainMap,
  coreFactories,
  CoreFactories,
  HyperlaneAddressesMap,
  HyperlaneApp,
  HyperlaneCore,
  MultiProvider,
  objMap,
} from '@hyperlane-xyz/sdk';
import { utils } from '@hyperlane-xyz/utils';
import assert from 'assert';
import { BigNumber, ContractReceipt, ethers } from 'ethers';
import yargs from 'yargs';
import {
  assertBalances,
  assertBytes20,
  assertBytes32,
  getMultiProvider,
  mergedContractAddresses,
} from '../src/config';
import { readJSONAtPath } from '../src/json';

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

export function getArgs(multiProvider: MultiProvider) {
  // Only accept chains for which we have both a connection and contract addresses
  const { intersection } = multiProvider.intersect(
    Object.keys(mergedContractAddresses),
  );
  return yargs(process.argv.slice(2))
    .describe('origin', 'chain to send tokens from')
    .choices('origin', intersection)
    .demandOption('origin')
    .string('origin')
    .describe('destination', 'chain to send tokens to')
    .choices('destination', intersection)
    .demandOption('destination')
    .string('destination')
    .describe('wei', 'amount in wei to send')
    .demandOption('wei')
    .number('wei')
    .describe('key', 'hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .describe('recipient', 'token recipient address')
    .string('recipient')
    .coerce('recipient', assertBytes20)
    .demandOption('recipient')
    .describe('timeout', 'timeout in seconds')
    .number('timeout')
    .default('timeout', 10 * 60)
    .middleware(assertBalances(multiProvider, (argv) => [argv.origin])).argv;
}

function hypErc20FromAddressesMap(
  addressesMap: ChainMap<{ [key: string]: TokenType }>,
  multiProvider: MultiProvider,
): HypERC20App {
  const contractsMap = objMap(addressesMap, (chain, value) => {
    const entries = Object.entries(value);
    if (entries.length !== 1)
      throw new Error('Cannot handle multiple warp route deployements');
    const tokenAddress = entries[0][0];
    const tokenType = entries[0][1];
    const signer = multiProvider.getSigner(chain);
    switch (tokenType) {
      case TokenType.collateral: {
        const router = HypERC20Collateral__factory.connect(
          tokenAddress,
          signer,
        );
        return { router };
      }
      case TokenType.native: {
        const router = HypNative__factory.connect(tokenAddress, signer);
        return { router };
      }
      case TokenType.synthetic: {
        const router = HypERC20__factory.connect(tokenAddress, signer);
        return { router };
      }
      default: {
        throw new Error('Unsupported token type');
      }
    }
  });
  return new HypERC20App(contractsMap, multiProvider);
}

// TODO DRY up with test-messages script
async function main() {
  let timedOut = false;
  const multiProvider = getMultiProvider();
  const { recipient, origin, destination, wei, key, timeout } = await getArgs(
    multiProvider,
  );
  const timeoutId = setTimeout(() => {
    timedOut = true;
  }, timeout * 1000);
  const signer = new ethers.Wallet(key);
  multiProvider.setSharedSigner(signer);
  const addressesMap: ChainMap<{ [key: string]: TokenType }> = readJSONAtPath(
    './artifacts/warp-token-addresses.json',
  );
  const app = hypErc20FromAddressesMap(addressesMap, multiProvider);

  const getDestinationBalance = async (): Promise<BigNumber> => {
    const destinationType = Object.entries(addressesMap[destination])[0][1];
    switch (destinationType) {
      case TokenType.collateral: {
        const router = app.getContracts(destination)
          .router as HypERC20Collateral;
        const tokenAddress = await router.wrappedToken();
        const token = ERC20__factory.connect(tokenAddress, signer);
        return token.balanceOf(recipient);
      }
      case TokenType.native: {
        return multiProvider.getProvider(destination).getBalance(recipient);
      }
      case TokenType.synthetic: {
        const router = app.getContracts(destination).router as HypERC20;
        return router.balanceOf(recipient);
      }
      default: {
        throw new Error('Unsupported collateral type');
      }
    }
  };
  const balanceBefore = await getDestinationBalance();
  console.log({ balanceBefore });

  const core = coreFromAddressesMap(mergedContractAddresses, multiProvider);

  const originType = Object.entries(addressesMap[origin])[0][1];
  let receipt: ContractReceipt;
  switch (originType) {
    case TokenType.collateral: {
      const router = app.getContracts(origin).router as HypERC20Collateral;
      const tokenAddress = await router.wrappedToken();
      const token = ERC20__factory.connect(tokenAddress, signer);
      const approval = await token.allowance(
        await signer.getAddress(),
        router.address,
      );
      if (approval.lt(wei)) {
        await token.approve(router.address, wei);
      }
      receipt = await app.transfer(
        origin,
        destination,
        utils.addressToBytes32(recipient),
        wei,
      );
      break;
    }
    case TokenType.native: {
      const destinationDomain = multiProvider.getDomainId(destination);
      const router = app.getContracts(origin).router as HypNative;
      const gasPayment = await router.quoteGasPayment(destinationDomain);
      console.log({ gasPayment: gasPayment.toString() });
      const value = gasPayment.add(wei);
      const tx = await router.transferRemote(
        destinationDomain,
        utils.addressToBytes32(recipient),
        wei,
        { value },
      );
      receipt = await tx.wait();
      break;
    }
    case TokenType.synthetic: {
      receipt = await app.transfer(
        origin,
        destination,
        utils.addressToBytes32(recipient),
        wei,
      );
      break;
    }
    default: {
      throw new Error('Unsupported token type');
    }
  }

  const messages = await core.getDispatchedMessages(receipt);
  const message = messages[0];
  console.log({ message, parsed: message.parsed });
  const destinationn = multiProvider.getChainName(message.parsed.destination);
  assert(destination === destinationn);

  // TODO: Why not balance change?
  while (
    !(await core.getContracts(destination).mailbox.delivered(message.id)) &&
    !timedOut
  ) {
    console.log(`Waiting for message delivery on destination chain`);
    await utils.sleep(1000);
  }

  if (!timedOut) {
    console.log(`Message delivered on destination chain!`);
  }

  clearTimeout(timeoutId);
  if (timedOut) {
    console.error('Timed out waiting for messages to be delivered');
    process.exit(1);
  }
}

main()
  .then(() => console.info('Warp test transfer complete'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
