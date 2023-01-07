// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/console.sol";
import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/StdJson.sol";

import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {InterchainGasPaymaster} from "@hyperlane-xyz/core/contracts/InterchainGasPaymaster.sol";
import {ProxyAdmin} from "@hyperlane-xyz/core/contracts/upgrade/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {DeployLib} from "../lib/DeployLib.sol";

contract DeployCore is Script {
    using DeployLib for DeployLib.HyperlaneDeployment;

    function run() public {
        // Read all the config we need first so that we ensure valid
        // config before sending any transactions.
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory local = vm.envString("LOCAL");
        string[] memory remotes = vm.envString("REMOTES", ",");
        DeployLib.HyperlaneDeployment memory deployment = DeployLib.getHyperlaneDeployment(vm, local);
        DeployLib.MultisigIsmConfig[] memory configs = DeployLib
            .getMultisigIsmConfigs(vm, remotes);

        vm.startBroadcast(deployerPrivateKey);
        uint256 startBlock = block.number;

        MultisigIsm ism = DeployLib.deployMultisigIsm(configs);

        deployment.deployProxyAdmin();
        deployment.deployIgp();
        deployment.deployMailbox(address(ism));


        // Write the output to disk
        deployment.write(vm);
        deployment.writeAgentConfig(vm, startBlock, "./config/agent_config.json");
    }
}
