// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";
import {Vm} from "../lib/forge-std/src/Vm.sol";

import {BytesLib} from "../lib/BytesLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {InterchainGasPaymaster} from "@hyperlane-xyz/core/contracts/InterchainGasPaymaster.sol";
import {ProxyAdmin} from "@hyperlane-xyz/core/contracts/upgrade/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {Create2Factory} from "@hyperlane-xyz/core/contracts/Create2Factory.sol";

library DeployLib {
    using stdJson for string;
    using BytesLib for bytes;

    struct HyperlaneDeployment {
        string chainName;
        uint32 domainId;
        address owner;
        Mailbox mailbox;
        InterchainGasPaymaster igp;
        ProxyAdmin admin;
        Create2Factory create2;
    }

    function getContractAddress(Vm vm, string memory chainName, string memory contractName) internal view returns (address) {
        string memory json = vm.readFile("config/networks.json");
        string memory prefix = ".contracts.";
        try vm.parseJson(json, string.concat(chainName, string.concat(prefix, contractName))) returns (bytes memory result) {
            address parsedAddr = abi.decode(result, (address));
            return parsedAddr == address(0x20) ? address(0) : parsedAddr;
        } catch {
            return address(0);
        }
    }

    function getHyperlaneDeployment(Vm vm, string memory chainName)
        internal
        view
        returns (HyperlaneDeployment memory)
    {
        string memory json = vm.readFile("config/networks.json");
        uint32 domainId = abi.decode(
            vm.parseJson(json, string.concat(chainName, ".id")),
            (uint32)
        );
        address owner = abi.decode(
            vm.parseJson(json, string.concat(chainName, ".owner")),
            (address)
        );
        Mailbox mailbox = Mailbox(getContractAddress(vm, chainName, "mailbox"));
        InterchainGasPaymaster igp = InterchainGasPaymaster(getContractAddress(vm, chainName, "interchainGasPaymaster"));
        ProxyAdmin admin = ProxyAdmin(getContractAddress(vm, chainName, "proxyAdmin"));
        Create2Factory create2 = Create2Factory(getContractAddress(vm, chainName, "create2Factory"));
        return HyperlaneDeployment(chainName, domainId, owner, mailbox, igp, admin, create2);
    }

    function deployProxyAdmin(HyperlaneDeployment memory deployment)
        internal
    {
        if (address(deployment.admin) == address(0)) {
            deployment.admin = new ProxyAdmin();
            deployment.admin.transferOwnership(deployment.owner);
        }
        require(deployment.admin.owner() == deployment.owner, "!ProxyAdmin owner");
    }

    function deployIgp(HyperlaneDeployment memory deployment)
        internal
    {
        require(address(deployment.admin) != address(0), "must deploy ProxyAdmin before IGP");
        if (address(deployment.igp) == address(0)) {
            InterchainGasPaymaster impl = new InterchainGasPaymaster();
            bytes memory initData = abi.encodeCall(
                InterchainGasPaymaster.initialize,
                ()
            );
            TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
                address(impl),
                address(deployment.admin),
                initData
            );
            deployment.igp = InterchainGasPaymaster(address(proxy));
            deployment.igp.transferOwnership(deployment.owner);
        }
        require(deployment.igp.owner() == deployment.owner, "!IGP owner");
    }

    function deployMailbox(
        HyperlaneDeployment memory deployment,
        address defaultIsm
    ) internal {
        require(address(deployment.admin) != address(0), "must deploy ProxyAdmin before Mailbox");
        if (address(deployment.mailbox) == address(0)) {
            Mailbox mailbox = new Mailbox(deployment.domainId);
            bytes memory initData = abi.encodeCall(
                Mailbox.initialize,
                (deployment.owner, defaultIsm)
            );
            TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
                address(mailbox),
                address(deployment.admin),
                initData
            );
            deployment.mailbox = Mailbox(address(proxy));
        }
        require(deployment.mailbox.owner() == deployment.owner, "!Mailbox owner");
    }

    function writeAgentConfig(HyperlaneDeployment memory deployment, Vm vm, uint256 startBlock, string memory filepath) internal {
        string memory baseConfig = "config";
        vm.serializeString(baseConfig, "domain", vm.toString(uint256(deployment.domainId)));
        vm.serializeString(baseConfig, "rpcStyle", "ethereum");
        vm.serializeString(baseConfig, "finalityBlocks", "POPULATE_ME");

        string memory addresses = "addresses";
        vm.serializeAddress(addresses, "mailbox", address(deployment.mailbox));
        vm.serializeString(baseConfig, "addresses", vm.serializeAddress(addresses, "interchainGasPaymaster", address(deployment.igp)));

        string memory connection = "connection";
        vm.serializeString(connection, "type", "http");
        vm.serializeString(baseConfig, "connection", vm.serializeString(connection, "url", ""));

        string memory index = "index";
        vm.serializeString(baseConfig, "index", vm.serializeString(index, "from", vm.toString(startBlock)));

        vm.serializeString(baseConfig, "name", deployment.chainName).write(filepath);
    }

    function write(HyperlaneDeployment memory deployment, Vm vm) internal {
        string memory contracts = "contracts";
        vm.serializeAddress(contracts, "mailbox", address(deployment.mailbox));
        vm.serializeAddress(contracts, "interchainGasPaymaster", address(deployment.igp));
        vm.serializeAddress(contracts, "proxyAdmin", address(deployment.admin));
        vm.serializeAddress(contracts, "create2Factory", address(deployment.create2)).write("./config/networks.json", string.concat(".", deployment.chainName, ".contracts"));
    }

    struct MultisigIsmConfig {
        uint32 domainId;
        uint8 threshold;
        address[] validators;
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
        
        json = vm.readFile("config/networks.json");
        uint32 domainId = abi.decode(
            vm.parseJson(json, string.concat(chainName, ".id")),
            (uint32)
        );
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
