// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/console.sol";
import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/StdJson.sol";

import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {InterchainGasPaymaster} from "@hyperlane-xyz/core/contracts/InterchainGasPaymaster.sol";
import {ProxyAdmin} from "@hyperlane-xyz/core/contracts/upgrade/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {DeployLib} from "../lib/DeployLib.sol";

contract DeployCore is Script {
    function deployIgp(address proxyAdmin)
        internal
        returns (InterchainGasPaymaster)
    {
        InterchainGasPaymaster igp = new InterchainGasPaymaster();
        bytes memory initData = abi.encodeCall(
            InterchainGasPaymaster.initialize,
            ()
        );
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(igp),
            proxyAdmin,
            initData
        );
        console.log("InterchainGasPaymaster deployed at address %s", address(proxy));
        return InterchainGasPaymaster(address(proxy));
    }

    function deployMailbox(
        address deployer,
        address proxyAdmin,
        uint32 domainId,
        address defaultIsm
    ) internal returns (Mailbox) {
        Mailbox mailbox = new Mailbox(domainId);
        bytes memory initData = abi.encodeCall(
            Mailbox.initialize,
            (deployer, defaultIsm)
        );
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(mailbox),
            proxyAdmin,
            initData
        );
        console.log("Mailbox deployed at address %s", address(proxy));
        return Mailbox(address(proxy));
    }

    function writeAgentConfig(string memory network, uint32 localDomain, address mailbox, address igp, uint256 startBlock) internal {
        string memory baseConfig = "config";
        vm.serializeString(baseConfig, "domain", vm.toString(uint256(localDomain)));
        vm.serializeString(baseConfig, "rpcStyle", "ethereum");
        vm.serializeString(baseConfig, "finalityBlocks", "POPULATE_ME");

        string memory addresses = "addresses";
        vm.serializeAddress(addresses, "mailbox", mailbox);
        vm.serializeString(baseConfig, "addresses", vm.serializeAddress(addresses, "interchainGasPaymaster", igp));

        string memory connection = "connection";
        vm.serializeString(connection, "type", "http");
        vm.serializeString(baseConfig, "connection", vm.serializeString(connection, "url", ""));

        string memory index = "index";
        vm.serializeString(baseConfig, "index", vm.serializeString(index, "from", vm.toString(startBlock)));

        vm.writeJson(vm.serializeString(baseConfig, "name", network), "./config/agent_config.json");
    }

    function run() public {
        // Read all the config we need first so that we ensure valid
        // config before sending any transactions.
        address owner = vm.envAddress("OWNER");
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory local = vm.envString("LOCAL");
        uint32 localDomain = DeployLib.getDomainId(vm, local);
        string[] memory remotes = vm.envString("REMOTES", ",");
        DeployLib.MultisigIsmConfig[] memory configs = DeployLib
            .getMultisigIsmConfigs(vm, remotes);

        vm.startBroadcast(deployerPrivateKey);
        uint256 startBlock = block.number;

        MultisigIsm ism = DeployLib.deployMultisigIsm(configs);
        ProxyAdmin proxyAdmin = new ProxyAdmin();
        InterchainGasPaymaster igp = deployIgp(address(proxyAdmin));
        address deployer = vm.addr(deployerPrivateKey);
        Mailbox mailbox = deployMailbox(
            deployer,
            address(proxyAdmin),
            localDomain,
            address(ism)
        );

        // Transfer ownership of ownable contracts.
        proxyAdmin.transferOwnership(owner);
        igp.transferOwnership(owner);
        mailbox.transferOwnership(owner);
        ism.transferOwnership(owner);

        // Write the partial agent config to disk.
        writeAgentConfig(local, localDomain, address(mailbox), address(igp), startBlock);
    }
}
