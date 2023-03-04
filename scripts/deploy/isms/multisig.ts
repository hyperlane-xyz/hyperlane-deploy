import { HyperlanePermissionlessCoreDeployer } from '../../../src/deployer';

async function main() {
  const deployer = await HyperlanePermissionlessCoreDeployer.fromArgs();
  try {
    const contract = await deployer.deployMultisigIsm();
    await deployer.deployTestRecipient(contract.address);
  } catch (e) {
    console.error(`Encountered error during deploy`);
    console.error(e);
  }
}

main().then(console.log).catch(console.error);
