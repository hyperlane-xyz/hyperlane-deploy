// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/Script.sol";
import {Vm} from "../lib/forge-std/src/Vm.sol";

import {BytesLib} from "../lib/BytesLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";

library DeployLib {
    using stdJson for string;
    using BytesLib for bytes;

    struct MultisigIsmConfig {
        uint32 domainId;
        uint8 threshold;
        address[] validators;
    }

    function getDomainId(Vm vm, string memory chainName)
        internal
        view
        returns (uint32)
    {
        string memory json = vm.readFile("config/networks.json");
        uint32 domainId = abi.decode(
            vm.parseJson(json, string.concat(chainName, ".id")),
            (uint32)
        );
        return domainId;
    }

    function getMultisigIsmConfig(Vm vm, string memory chainName)
        internal
        view
        returns (MultisigIsmConfig memory)
    {
        string memory json = vm.readFile("config/multisig_ism.json");
        uint8 threshold = abi.decode(
            vm.parseJson(json, string.concat(chainName, ".threshold")),
            (uint8)
        );
        bytes memory validatorBytes = json.parseRaw(
            string.concat(chainName, ".validators[*].address")
        );
        uint256 numValidators = validatorBytes.length / 32;
        address[] memory validators = new address[](numValidators);
        for (uint256 i = 0; i < validators.length; i++) {
            validators[i] = abi.decode(
                validatorBytes.slice(i * 32, 32),
                (address)
            );
        }
        uint32 domainId = getDomainId(vm, chainName);
        return MultisigIsmConfig(domainId, threshold, validators);
    }

    function getMultisigIsmConfigs(Vm vm, string[] memory chainNames)
        internal
        view
        returns (MultisigIsmConfig[] memory)
    {
        MultisigIsmConfig[] memory configs = new MultisigIsmConfig[](
            chainNames.length
        );
        for (uint256 i = 0; i < chainNames.length; i++) {
            string memory chainName = chainNames[i];
            configs[i] = getMultisigIsmConfig(vm, chainName);
        }
        return configs;
    }

    function deployMultisigIsm(MultisigIsmConfig[] memory remotes)
        internal
        returns (MultisigIsm)
    {
        // Deploy a default MultisigIsm and enroll validators for remote
        // networks.
        MultisigIsm ism = new MultisigIsm();
        uint32[] memory remoteDomainIds = new uint32[](remotes.length);
        uint8[] memory remoteThresholds = new uint8[](remotes.length);
        address[][] memory remoteValidators = new address[][](remotes.length);
        for (uint256 i = 0; i < remotes.length; i++) {
            remoteDomainIds[i] = remotes[i].domainId;
            remoteThresholds[i] = remotes[i].threshold;
            remoteValidators[i] = remotes[i].validators;
        }
        ism.enrollValidators(remoteDomainIds, remoteValidators);
        ism.setThresholds(remoteDomainIds, remoteThresholds);
        return ism;
    }
}
