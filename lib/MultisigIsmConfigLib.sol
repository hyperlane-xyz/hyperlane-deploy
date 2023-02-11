// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/console.sol";
import {Vm} from "../lib/forge-std/src/Vm.sol";
import {NetworkConfigLib} from "./NetworkConfigLib.sol";

import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";

// Struct keys must be alphabetically sorted for JSON serialization
// see https://book.getfoundry.sh/cheatcodes/parse-json?highlight=serialize#decoding-json-objects-into-solidity-structs
library MultisigIsmConfigLib {
    struct ValidatorConfig {
        address addr;
        string name;
    }

    struct PartialMultisigIsmDomainConfig {
        uint8 threshold;
        ValidatorConfig[] validators;
    }

    struct MultisigIsmDomainConfig {
        uint32 domain;
        uint8 threshold;
        address[] validators;
    }

    struct MultisigIsmConfig {
        MultisigIsmDomainConfig[] domains;
        address owner;
    }

    function readConfig(
        Vm vm,
        string memory local,
        string[] memory remotes
    ) internal view returns (MultisigIsmConfig memory) {
        NetworkConfigLib.NetworkConfig memory network = NetworkConfigLib
            .readConfig(vm, local);
        MultisigIsmDomainConfig[]
            memory domains = new MultisigIsmDomainConfig[](remotes.length);
        for (uint256 i = 0; i < remotes.length; i++) {
            domains[i] = _readMultisigIsmDomainConfig(vm, remotes[i]);
        }
        return MultisigIsmConfig(domains, network.owner);
    }

    function deploy(
        MultisigIsmConfig memory config
    ) internal returns (MultisigIsm) {
        // Deploy a default MultisigIsm and enroll validators for remote
        // networks.
        MultisigIsm ism = new MultisigIsm();
        console.log("MultisigIsm deployed to address %s", address(ism));
        uint32[] memory remoteDomainIds = new uint32[](config.domains.length);
        uint8[] memory remoteThresholds = new uint8[](config.domains.length);
        address[][] memory remoteValidators = new address[][](
            config.domains.length
        );
        for (uint256 i = 0; i < config.domains.length; i++) {
            remoteDomainIds[i] = config.domains[i].domain;
            remoteThresholds[i] = config.domains[i].threshold;
            remoteValidators[i] = config.domains[i].validators;
        }
        ism.enrollValidators(remoteDomainIds, remoteValidators);
        ism.setThresholds(remoteDomainIds, remoteThresholds);
        ism.transferOwnership(config.owner);
        return ism;
    }

    function _readMultisigIsmDomainConfig(
        Vm vm,
        string memory chainName
    ) private view returns (MultisigIsmDomainConfig memory) {
        string memory file = vm.readFile("config/multisig_ism.json");
        bytes memory chain = vm.parseJson(file, chainName);
        PartialMultisigIsmDomainConfig memory _partial = abi.decode(
            chain,
            (PartialMultisigIsmDomainConfig)
        );
        NetworkConfigLib.NetworkConfig memory network = NetworkConfigLib
            .readConfig(vm, chainName);
        address[] memory validators = new address[](_partial.validators.length);
        for (uint256 i = 0; i < _partial.validators.length; i++) {
            validators[i] = _partial.validators[i].addr;
        }
        return
            MultisigIsmDomainConfig({
                domain: network.domain,
                threshold: _partial.threshold,
                validators: validators
            });
    }
}
