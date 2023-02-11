// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import {Vm} from "../lib/forge-std/src/Vm.sol";
import {StringLib} from "./StringLib.sol";

// Struct keys must be alphabetically sorted for JSON serialization
// see https://book.getfoundry.sh/cheatcodes/parse-json?highlight=serialize#decoding-json-objects-into-solidity-structs
library NetworkConfigLib {
    using StringLib for string;
    string constant NETWORKS_FILEPATH = "./config/networks.json";

    struct NetworkConfig {
        uint32 domain;
        address owner;
    }

    function readNetworks(Vm vm) internal view returns (string[] memory) {
        string memory file = vm.readFile(NETWORKS_FILEPATH);
        bytes memory networks = vm.parseJson(file, "networks");
        return abi.decode(networks, (string[]));
    }

    function hasConfig(
        Vm vm,
        string memory chainName
    ) internal view returns (bool) {
        string memory file = vm.readFile(NETWORKS_FILEPATH);
        return file.count(string.concat('"', chainName, '"')) == 2;
    }

    function readConfig(
        Vm vm,
        string memory chainName
    ) internal view returns (NetworkConfig memory) {
        string memory file = vm.readFile(NETWORKS_FILEPATH);
        require(
            hasConfig(vm, chainName),
            string.concat(
                "configs/networks.json missing valid entry for ",
                chainName
            )
        );
        bytes memory chain = vm.parseJson(file, chainName);
        return abi.decode(chain, (NetworkConfig));
    }

    function digest(
        NetworkConfig memory network
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(network));
    }
}
