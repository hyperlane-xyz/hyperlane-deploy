// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";

// TODO: Deploy test recipient, maybe write to networks.
contract DeployGasOracles is Script {
    using ConfigLib for ConfigLib.HyperlaneDomainConfig;
    using ConfigLib for ConfigLib.GasOracleConfigs;
    using CheckLib for ConfigLib.GasOracleConfigs;
    using DeployLib for ConfigLib.GasOracleConfigs;

    function run() public {
        string memory local = vm.envString("LOCAL");
        string[] memory remotes = vm.envString("REMOTES", ",");

        ConfigLib.HyperlaneDomainConfig memory config = ConfigLib
            .readHyperlaneDomainConfig(vm, local);
        ConfigLib.GasOracleConfigs memory gasConfigs = ConfigLib
            .readGasOracleConfigs(vm, local, remotes);

        vm.startBroadcast();

        gasConfigs.deploy(config);
        gasConfigs.check(config.igp);

        console.log("Gas oracles deployed at the following address");
        for (uint256 i = 0; i < gasConfigs.remotes.length; i++) {
            address connectedGasOracles = address(config.igp.gasOracles(gasConfigs.remotes[i].domainId));
            console.log("Deployed gas oracle for domain %s at address %s", gasConfigs.remotes[i].domainId, connectedGasOracles);
        }
        gasConfigs.write(vm, config.igp, local);
    }
}
