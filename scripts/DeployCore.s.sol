// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";

import {CoreConfigLib} from "../lib/CoreConfigLib.sol";
import {NetworkConfigLib} from "../lib/NetworkConfigLib.sol";
import {MultisigIsmConfigLib} from "../lib/MultisigIsmConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {IInterchainSecurityModule} from "@hyperlane-xyz/core/interfaces/IInterchainSecurityModule.sol";

contract DeployCore is Script {
    using CheckLib for CoreConfigLib.CoreDeployment;
    using MultisigIsmConfigLib for MultisigIsmConfigLib.MultisigIsmConfig;

    function run() public returns (CoreConfigLib.CoreDeployment memory core) {
        string memory local = vm.envString("LOCAL");
        string[] memory remotes = vm.envString("REMOTES", ",");

        NetworkConfigLib.NetworkConfig memory network = NetworkConfigLib
            .readConfig(vm, local);
        MultisigIsmConfigLib.MultisigIsmConfig
            memory multisig = MultisigIsmConfigLib.readConfig(
                vm,
                local,
                remotes
            );

        if (CoreConfigLib.hasDeployment(vm, local)) {
            console.log("Hyperlane already deployed on %s, skipping...", local);
            core = CoreConfigLib.readDeployment(vm, local);
        } else {
            vm.startBroadcast();
            console.log("Deploying Hyperlane to %s...", local);
            MultisigIsm ism = multisig.deploy();
            core = CoreConfigLib.deploy(
                network,
                IInterchainSecurityModule(ism)
            );
            vm.stopBroadcast();
            CoreConfigLib.writeDeployment(vm, local, core);
        }

        console.log("Checking Hyperlane deployment...");
        core.check(network);
        console.log("Everything looks good!");
        return core;
    }
}
