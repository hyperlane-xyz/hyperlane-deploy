// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";

// TODO: Deploy test recipient, maybe write to networks.
contract DeployMultisigIsm is Script {
    using DeployLib for ConfigLib.Multisig;
    using CheckLib for MultisigIsm;

    function run() public returns (MultisigIsm) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string[] memory remotes = vm.envString("REMOTES", ",");
        address owner = vm.envAddress("OWNER");

        ConfigLib.Multisig memory config = ConfigLib.readMultisigIsmConfig(vm, remotes, owner);

        vm.startBroadcast(deployerPrivateKey);

        MultisigIsm ism = config.deploy();

        vm.stopBroadcast();

        ism.check(config);

        return ism;
    }
}
