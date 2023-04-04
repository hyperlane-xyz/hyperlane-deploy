import { WarpRouteDeployer } from '../src/WarpRouteDeployer';

async function main() {
  console.info('Preparing Warp Route deployer');
  const deployer = await WarpRouteDeployer.fromArgs();
  console.info('Beginning warp route deployment');
  await deployer.deploy();
}

main()
  .then(() => console.info('Warp Routes deployed successfully'))
  .catch((e) => {
    console.error('Error deploying Warp Routes', e);
    process.exit(1);
  });
