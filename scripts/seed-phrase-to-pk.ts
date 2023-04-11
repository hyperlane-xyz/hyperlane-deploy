import { ethers } from 'ethers';
import yargs from 'yargs';

import { logger } from '../src/logger';

import { run } from './run';

run('Seed phrase to private key', async () => {
  const { seed } = await yargs(process.argv.slice(2))
    .describe('seed', 'seed phrase to derive key from')
    .string('seed')
    .demandOption('seed').argv;

  const wallet = ethers.Wallet.fromMnemonic(seed);
  logger('Wallet private key:\n============');
  logger(wallet.privateKey);
});
