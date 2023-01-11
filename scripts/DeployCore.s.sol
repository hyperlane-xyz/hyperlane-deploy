// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {CheckLib} from "../lib/CheckLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";

contract DeployCore is Script {
    using Strings for uint256;

    using DeployLib for ConfigLib.Core;
    using ConfigLib for ConfigLib.Core;
    using CheckLib for DeployLib.Core;

    function run() public returns (DeployLib.Core memory core) {
        string memory local = vm.envString("LOCAL");

        ConfigLib.Core memory coreConfig = ConfigLib.readCore(vm, local);
        
        string memory key = uint256(coreConfig.digest()).toString();
        string memory out = string.concat("deployments/core/", key);
        try vm.readFileBinary(out) returns (bytes memory data) {
            core = abi.decode(data, (DeployLib.Core));
        } catch {
            vm.startBroadcast();
            core = coreConfig.deploy();
            vm.stopBroadcast();
            vm.writeFileBinary(out, abi.encode(core));
        }

        core.check(coreConfig);
    }
}
