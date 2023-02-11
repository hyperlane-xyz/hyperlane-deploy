// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {MultisigIsmConfigLib} from "../lib/MultisigIsmConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";

contract DeployMultisigIsm is Script {
    using Strings for uint256;

    using MultisigIsmConfigLib for MultisigIsmConfigLib.MultisigIsmConfig;
    using CheckLib for MultisigIsm;

    function run() public returns (MultisigIsm) {
        string memory local = vm.envString("LOCAL");
        string[] memory remotes = vm.envString("REMOTES", ",");

        MultisigIsmConfigLib.MultisigIsmConfig
            memory config = MultisigIsmConfigLib.readConfig(vm, local, remotes);
        vm.startBroadcast();
        MultisigIsm ism = config.deploy();
        TestRecipient recipient = new TestRecipient();
        recipient.setInterchainSecurityModule(address(ism));
        console.log("TestRecipient deployed to address %s", address(recipient));
        vm.stopBroadcast();
        ism.check(config);
        return ism;
    }
}
