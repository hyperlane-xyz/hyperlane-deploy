import { ethers } from 'ethers';
import yargs from 'yargs';

async function main() {
  const { seed } = await yargs(process.argv.slice(2))
    .describe('seed', 'seed phrase to derive key from')
    .string('seed')
    .demandOption('seed').argv;

  const wallet = ethers.Wallet.fromMnemonic(seed);
  console.log('Wallet private key:\n============');
  console.log(wallet.privateKey);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
