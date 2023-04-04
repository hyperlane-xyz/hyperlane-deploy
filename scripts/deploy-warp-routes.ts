import { HyperlanePermissionlessDeployer } from '../src/HyperlanePermissionlessDeployer';

async function main() {
  console.info('Preparing Warp Route deployer');
  const deployer = await HyperlanePermissionlessDeployer.fromArgs();
  console.info('Beginning warp route deployment');
  await deployer.deploy();
}

main()
  .then(() => console.info('Warp Routes deployed successfully'))
  .catch((e) => {
    console.error('Error deploying Warp Routes', e);
    process.exit(1);
  });
