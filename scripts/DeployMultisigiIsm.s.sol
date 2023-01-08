// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";

contract DeployMultisigIsm is Script {
    using CheckLib for ConfigLib.MultisigIsmConfig;
    using DeployLib for ConfigLib.MultisigIsmConfig;

    function run() public {
        address owner = vm.envAddress("OWNER");
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string[] memory remotes = vm.envString("REMOTES", ",");
        ConfigLib.MultisigIsmConfig memory config = ConfigLib
            .readMultisigIsmConfig(vm, remotes);

        vm.startBroadcast(deployerPrivateKey);

        MultisigIsm ism = config.deploy(owner);
        config.check(ism, owner);
    }
}
