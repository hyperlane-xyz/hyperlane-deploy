import { HyperlanePermissionlessDeployer } from '../src/core/HyperlanePermissionlessDeployer';

async function main() {
  console.info('Preparing Hyperlane deployer');
  const deployer = await HyperlanePermissionlessDeployer.fromArgs();
  console.info('Beginning Hyperlane deployment');
  await deployer.deploy();
}

main()
  .then(() => console.info('Hyperlane deployment completed successfully'))
  .catch((e) => {
    console.error('Error deploying Hyperlane', e);
    process.exit(1);
  });
