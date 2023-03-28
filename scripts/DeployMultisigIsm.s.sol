// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";
import {InterchainGasPaymaster} from "@hyperlane-xyz/core/contracts/igps/InterchainGasPaymaster.sol";

// TODO: Deploy test recipient, maybe write to networks.
contract DeployMultisigIsm is Script {
    using CheckLib for ConfigLib.MultisigIsmConfig;
    using DeployLib for ConfigLib.MultisigIsmConfig;

    function run() public {
        address owner = vm.envAddress("OWNER");
        string[] memory remotes = vm.envString("REMOTES", ",");
        ConfigLib.MultisigIsmConfig memory config = ConfigLib
            .readMultisigIsmConfig(vm, remotes);

        vm.startBroadcast();

        MultisigIsm ism = config.deploy(owner);
        TestRecipient recipient = new TestRecipient();
        recipient.setInterchainSecurityModule(address(ism));
        console.log("TestRecipient deployed at address %s", address(recipient));

        InterchainGasPaymaster igp = new InterchainGasPaymaster();
        console.log(
            "InterchainGasPaymaster deployed at address %s",
            address(igp)
        );
        config.check(ism, owner);
    }
}
