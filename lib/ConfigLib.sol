// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/Script.sol";
import {Vm} from "../lib/forge-std/src/Vm.sol";

import {BytesLib} from "../lib/BytesLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {InterchainGasPaymaster} from "@hyperlane-xyz/core/contracts/igps/InterchainGasPaymaster.sol";
import {ValidatorAnnounce} from "@hyperlane-xyz/core/contracts/ValidatorAnnounce.sol";
import {ProxyAdmin} from "@hyperlane-xyz/core/contracts/upgrade/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {Create2Factory} from "@hyperlane-xyz/core/contracts/Create2Factory.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";

library ConfigLib {
    using stdJson for string;
    using BytesLib for bytes;

    struct HyperlaneDomainConfig {
        string chainName;
        uint32 domainId;
        address owner;
        Mailbox mailbox;
        InterchainGasPaymaster igp;
        ProxyAdmin admin;
        Create2Factory create2;
        ValidatorAnnounce validatorAnnounce;
        TestRecipient testRecipient;
    }

    struct MultisigIsmDomainConfig {
        string chainName;
        uint32 domainId;
        uint8 threshold;
        address[] validators;
    }

    struct MultisigIsmConfig {
        MultisigIsmDomainConfig[] domains;
    }

    function readContractAddress(
        Vm vm,
        string memory chainName,
        string memory contractName
    ) private view returns (address) {
        string memory json = vm.readFile("config/networks.json");
        string memory prefix = ".contracts.";
        try
            vm.parseJson(
                json,
                string.concat(
                    ".",
                    chainName,
                    string.concat(prefix, contractName)
                )
            )
        returns (bytes memory result) {
            address parsedAddr = abi.decode(result, (address));
            return parsedAddr == address(0x20) ? address(0) : parsedAddr;
        } catch {
            return address(0);
        }
    }

    function readHyperlaneDomainConfig(
        Vm vm,
        string memory chainName
    ) internal view returns (HyperlaneDomainConfig memory) {
        string memory json = vm.readFile("config/networks.json");
        // console.log(json);
        uint32 domainId = abi.decode(
            vm.parseJson(json, string.concat(".", chainName, ".id")),
            (uint32)
        );
        address owner = abi.decode(
            vm.parseJson(json, string.concat(".", chainName, ".owner")),
            (address)
        );
        Mailbox mailbox = Mailbox(
            readContractAddress(vm, chainName, "mailbox")
        );
        InterchainGasPaymaster igp = InterchainGasPaymaster(
            readContractAddress(vm, chainName, "interchainGasPaymaster")
        );
        ProxyAdmin admin = ProxyAdmin(
            readContractAddress(vm, chainName, "proxyAdmin")
        );
        Create2Factory create2 = Create2Factory(
            readContractAddress(vm, chainName, "create2Factory")
        );
        TestRecipient recipient = TestRecipient(
            readContractAddress(vm, chainName, "testRecipient")
        );
        ValidatorAnnounce validatorAnnounce = ValidatorAnnounce(
            readContractAddress(vm, chainName, "validatorAnnounce")
        );
        return
            HyperlaneDomainConfig(
                chainName,
                domainId,
                owner,
                mailbox,
                igp,
                admin,
                create2,
                validatorAnnounce,
                recipient
            );
    }

    function readMultisigIsmDomainConfig(
        Vm vm,
        string memory chainName
    ) private view returns (MultisigIsmDomainConfig memory) {
        console.log(chainName);
        string memory json = vm.readFile("config/multisig_ism.json");
        uint8 threshold = abi.decode(
            vm.parseJson(json, string.concat(".", chainName, ".threshold")),
            (uint8)
        );
        address[] memory validators = abi.decode(
            vm.parseJson(json, string.concat(".", chainName, ".validators")),
            (address[])
        );

        json = vm.readFile("config/networks.json");
        uint32 domainId = abi.decode(
            vm.parseJson(json, string.concat(".", chainName, ".id")),
            (uint32)
        );
        return
            MultisigIsmDomainConfig(chainName, domainId, threshold, validators);
    }

    function readMultisigIsmConfig(
        Vm vm,
        string[] memory chainNames
    ) internal view returns (MultisigIsmConfig memory) {
        MultisigIsmDomainConfig[]
            memory domains = new MultisigIsmDomainConfig[](chainNames.length);
        for (uint256 i = 0; i < chainNames.length; i++) {
            string memory chainName = chainNames[i];
            domains[i] = readMultisigIsmDomainConfig(vm, chainName);
        }
        return MultisigIsmConfig(domains);
    }

    function writeAgentConfig(
        HyperlaneDomainConfig memory config,
        Vm vm,
        uint256 startBlock
    ) internal {
        string memory baseConfig = "config";
        vm.serializeString(
            baseConfig,
            "domain",
            vm.toString(uint256(config.domainId))
        );
        vm.serializeString(baseConfig, "rpcStyle", "ethereum");
        vm.serializeString(baseConfig, "finalityBlocks", "POPULATE_ME");

        string memory addresses = "addresses";
        vm.serializeAddress(addresses, "mailbox", address(config.mailbox));
        vm.serializeAddress(
            addresses,
            "validatorAnnounce",
            address(config.validatorAnnounce)
        );
        vm.serializeString(
            baseConfig,
            "addresses",
            vm.serializeAddress(
                addresses,
                "interchainGasPaymaster",
                address(config.igp)
            )
        );

        string memory connection = "connection";
        vm.serializeString(connection, "type", "http");
        vm.serializeString(
            baseConfig,
            "connection",
            vm.serializeString(connection, "url", "")
        );

        string memory index = "index";
        vm.serializeString(
            baseConfig,
            "index",
            vm.serializeString(index, "from", vm.toString(startBlock))
        );

        vm.serializeString(baseConfig, "name", config.chainName);

        vm
            .serializeString(
                "topLevel",
                "chains",
                vm.serializeString(
                    "chainLevel",
                    config.chainName,
                    vm.serializeString(baseConfig, "protocol", "ethereum")
                )
            )
            .write(
                string.concat(
                    "./config/",
                    config.chainName,
                    "_agent_config.json"
                )
            );
    }

    function write(HyperlaneDomainConfig memory config, Vm vm) internal {
        string memory contracts = "contracts";
        vm.serializeAddress(contracts, "mailbox", address(config.mailbox));
        vm.serializeAddress(
            contracts,
            "interchainGasPaymaster",
            address(config.igp)
        );
        vm.serializeAddress(contracts, "proxyAdmin", address(config.admin));
        vm.serializeAddress(
            contracts,
            "validatorAnnounce",
            address(config.validatorAnnounce)
        );
        vm.serializeAddress(
            contracts,
            "testRecipient",
            address(config.testRecipient)
        );
        vm
            .serializeAddress(
                contracts,
                "create2Factory",
                address(config.create2)
            )
            .write(
                "./config/networks.json",
                string.concat(".", config.chainName, ".contracts")
            );
    }
}
