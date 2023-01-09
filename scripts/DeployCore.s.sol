// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";

contract DeployCore is Script {
    using DeployLib for ConfigLib.Core;
    using CheckLib for DeployLib.Core;

    function run() public returns (DeployLib.Core memory) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory local = vm.envString("LOCAL");

        ConfigLib.Core memory coreConfig = ConfigLib.readCore(vm, local);
        // vm.startBroadcast(deployerPrivateKey);
        // uint256 startBlock = block.number;

        DeployLib.Core memory core = coreConfig.deploy();

        core.check(coreConfig);

        return core;
    }
}
