// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";

contract DeployCore is Script {
    using ConfigLib for ConfigLib.HyperlaneDomainConfig;
    using CheckLib for ConfigLib.HyperlaneDomainConfig;
    using DeployLib for ConfigLib.HyperlaneDomainConfig;

    function run() public {
        string memory local = vm.envString("LOCAL");
        string[] memory remotes = vm.envString("REMOTES", ",");
        ConfigLib.HyperlaneDomainConfig memory config = ConfigLib
            .readHyperlaneDomainConfig(vm, local);
        ConfigLib.MultisigIsmConfig memory ismConfig = ConfigLib
            .readMultisigIsmConfig(vm, remotes);

        vm.startBroadcast();
        uint256 startBlock = block.number;

        config.deploy(ismConfig);
        config.check(ismConfig);

        // Write the output to disk
        config.write(vm);
        config.writeAgentConfig(vm, startBlock);

        vm.stopBroadcast();
    }
}
