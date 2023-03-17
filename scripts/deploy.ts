import { HyperlanePermissionlessDeployer } from '../src/deployer';

async function main() {
  const deployer = await HyperlanePermissionlessDeployer.fromArgs();
  try {
    await deployer.deploy();
  } catch (e) {
    console.error(`Encountered error during deploy`);
    console.error(e);
  }
}

main().then(console.log).catch(console.error);