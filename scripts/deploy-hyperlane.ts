import { HyperlanePermissionlessDeployer } from '../src/core/HyperlanePermissionlessDeployer';
import { logger } from '../src/logger';

import { run } from './run';

run('Hyperlane deployment', async () => {
  logger('Preparing Hyperlane deployer');
  const deployer = await HyperlanePermissionlessDeployer.fromArgs();
  logger('Beginning Hyperlane deployment');
  await deployer.deploy();
});
