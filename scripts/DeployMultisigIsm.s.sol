// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";

contract DeployMultisigIsm is Script {
    using Strings for uint256;

    using DeployLib for ConfigLib.Multisig;
    using ConfigLib for ConfigLib.Multisig;
    using CheckLib for MultisigIsm;

    function run() public returns (MultisigIsm ism) {
        string[] memory remotes = vm.envString("REMOTES", ",");
        address owner = vm.envAddress("OWNER");

        ConfigLib.Multisig memory config = ConfigLib.readMultisigIsmConfig(
            vm,
            remotes,
            owner
        );

        string memory key = uint256(config.digest()).toString();
        string memory out = string.concat("deployments/ism/", key);
        try vm.readFileBinary(out) returns (bytes memory data) {
            ism = abi.decode(data, (MultisigIsm));
        } catch {
            vm.startBroadcast();
            ism = config.deploy();
            vm.stopBroadcast();
            vm.writeFileBinary(out, abi.encode(ism));
        }

        ism.check(config);
    }
}
