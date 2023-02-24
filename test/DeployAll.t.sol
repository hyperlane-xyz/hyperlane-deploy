// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";

// TODO: Deploy test recipient, maybe write to networks.
contract DeployAll is Test {
    using CheckLib for ConfigLib.MultisigIsmConfig;
    using DeployLib for ConfigLib.MultisigIsmConfig;

    function setUp() public {}

    function testDeploy() public {
        address owner = vm.envAddress("OWNER");
        string[] memory remotes = vm.envString("REMOTES", ",");
        ConfigLib.MultisigIsmConfig memory config = ConfigLib
            .readMultisigIsmConfig(vm, remotes);

        ConfigLib.GasOracleConfig memory gasOracleConfig = ConfigLib
            .readGasOracleConfig(vm, "goerli", "arbitrumgoerli");


        // StorageGasOracle[] gasOracles = config.deploy()
        // MultisigIsm ism = config.deploy(owner);
        // TestRecipient recipient = new TestRecipient();
        // recipient.setInterchainSecurityModule(address(ism));
        // console.log("TestRecipient deployed at address %s", address(recipient));
        // config.check(ism, owner);
    }
}
