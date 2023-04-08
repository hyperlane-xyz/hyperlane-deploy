import { logger } from '../src/logger';
import { WarpRouteDeployer } from '../src/warp/WarpRouteDeployer';

import { run } from './run';

run('Hyperlane deployment', async () => {
  logger('Preparing Warp Route deployer');
  const deployer = await WarpRouteDeployer.fromArgs();
  logger('Beginning warp route deployment');
  await deployer.deploy();
});
