import { WarpRouteDeployer } from '../src/WarpRouteDeployer';

async function main() {
  console.info('Preparing Test ERC20 deployer');
  const deployer = await WarpRouteDeployer.fromArgs();
  console.info('Beginning Test ERC20 deployment');
  // TODO get values from args for this
  await deployer.deployTestErc20('anvil1', {
    name: 'Test ERC20',
    symbol: 'TEST',
    decimals: 18,
  });
}

main()
  .then(() => console.info('Test ERC20 deployed successfully'))
  .catch((e) => {
    console.error('Error deploying Test ERC20', e);
    process.exit(1);
  });
