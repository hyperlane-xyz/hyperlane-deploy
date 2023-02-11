// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";
import {Vm} from "./forge-std/src/Vm.sol";
import {NetworkConfigLib} from "./NetworkConfigLib.sol";
import {StringLib} from "./StringLib.sol";

import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {InterchainGasPaymaster} from "@hyperlane-xyz/core/contracts/igps/InterchainGasPaymaster.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {ValidatorAnnounce} from "@hyperlane-xyz/core/contracts/ValidatorAnnounce.sol";
import {ProxyAdmin} from "@hyperlane-xyz/core/contracts/upgrade/ProxyAdmin.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";
import {IInterchainSecurityModule} from "@hyperlane-xyz/core/interfaces/IInterchainSecurityModule.sol";

// Struct keys must be alphabetically sorted for JSON serialization
// see https://book.getfoundry.sh/cheatcodes/parse-json?highlight=serialize#decoding-json-objects-into-solidity-structs
library CoreConfigLib {
    using stdJson for string;
    using StringLib for string;
    using NetworkConfigLib for NetworkConfigLib.NetworkConfig;

    string constant DEPLOYMENT_FILEPATH = "./deployments/contracts.json";

    struct CoreDeployment {
        ProxyAdmin proxyAdmin;
        InterchainGasPaymaster interchainGasPaymaster;
        Mailbox mailbox;
        TestRecipient testRecipient;
        ValidatorAnnounce validatorAnnounce;
    }

    struct IndexConfig {
        uint256 from;
    }

    struct AgentAddressesConfig {
        InterchainGasPaymaster igp;
        Mailbox mailbox;
        ValidatorAnnounce validatorAnnounce;
    }

    // mirrors RustChainSetup in monorepo/typescript/infra/src/config/agent.ts:257
    struct AgentConfig {
        AgentAddressesConfig addresses;
        uint32 domain;
        uint256 finalityBlocks;
        IndexConfig index;
        string rpcStyle;
        string url;
    }

    function hasDeployment(
        Vm vm,
        string memory chainName
    ) internal view returns (bool) {
        string memory json = vm.readFile(DEPLOYMENT_FILEPATH);
        return json.contains(chainName);
    }

    function writeDeployment(
        Vm vm,
        string memory chainName,
        CoreDeployment memory core
    ) internal {
        string[] memory networks = NetworkConfigLib.readNetworks(vm);
        string memory objectKey = "contracts";
        for (uint256 i = 0; i < networks.length; i++) {
            string memory network = networks[i];
            if (hasDeployment(vm, network)) {
                vm.serializeString(
                    objectKey,
                    network,
                    serializeDeployment(
                        vm,
                        network,
                        readDeployment(vm, network)
                    )
                );
            }
        }
        vm
            .serializeString(
                objectKey,
                chainName,
                serializeDeployment(vm, chainName, core)
            )
            .write(DEPLOYMENT_FILEPATH);
    }

    function readDeploymentAddress(
        Vm vm,
        string memory json,
        string memory chainName,
        string memory key
    ) private pure returns (address) {
        string memory path = string.concat(chainName, ".", key);
        bytes memory data = vm.parseJson(json, path);
        return abi.decode(data, (address));
    }

    function readDeployment(
        Vm vm,
        string memory chainName
    ) internal view returns (CoreDeployment memory) {
        string memory json = vm.readFile(DEPLOYMENT_FILEPATH);
        require(
            json.contains(chainName),
            string.concat("Unable to find deployment for ", chainName)
        );
        address mailbox = readDeploymentAddress(vm, json, chainName, "mailbox");
        address igp = readDeploymentAddress(
            vm,
            json,
            chainName,
            "interchainGasPaymaster"
        );
        address admin = readDeploymentAddress(
            vm,
            json,
            chainName,
            "proxyAdmin"
        );
        address recipient = readDeploymentAddress(
            vm,
            json,
            chainName,
            "testRecipient"
        );
        address va = readDeploymentAddress(
            vm,
            json,
            chainName,
            "validatorAnnounce"
        );
        return
            CoreDeployment({
                mailbox: Mailbox(mailbox),
                interchainGasPaymaster: InterchainGasPaymaster(igp),
                validatorAnnounce: ValidatorAnnounce(va),
                testRecipient: TestRecipient(recipient),
                proxyAdmin: ProxyAdmin(admin)
            });
    }

    function serializeDeployment(
        Vm vm,
        string memory objectKey,
        CoreDeployment memory core
    ) internal returns (string memory) {
        vm.serializeAddress(
            objectKey,
            "interchainGasPaymaster",
            address(core.interchainGasPaymaster)
        );
        vm.serializeAddress(objectKey, "mailbox", address(core.mailbox));
        vm.serializeAddress(objectKey, "proxyAdmin", address(core.proxyAdmin));
        vm.serializeAddress(
            objectKey,
            "testRecipient",
            address(core.testRecipient)
        );
        return
            vm.serializeAddress(
                objectKey,
                "validatorAnnounce",
                address(core.validatorAnnounce)
            );
    }

    function deploy(
        NetworkConfigLib.NetworkConfig memory network,
        IInterchainSecurityModule ism
    ) internal returns (CoreDeployment memory) {
        ProxyAdmin admin = new ProxyAdmin();
        admin.transferOwnership(network.owner);
        InterchainGasPaymaster igpImplementation = new InterchainGasPaymaster();
        TransparentUpgradeableProxy igpProxy = new TransparentUpgradeableProxy(
            address(igpImplementation),
            address(admin),
            abi.encodeCall(InterchainGasPaymaster.initialize, ())
        );
        InterchainGasPaymaster igp = InterchainGasPaymaster(address(igpProxy));
        igp.transferOwnership(network.owner);

        Mailbox mailboxImplementation = new Mailbox(network.domain);
        TransparentUpgradeableProxy mailboxProxy = new TransparentUpgradeableProxy(
                address(mailboxImplementation),
                address(admin),
                abi.encodeCall(
                    Mailbox.initialize,
                    (network.owner, address(ism))
                )
            );
        Mailbox mailbox = Mailbox(address(mailboxProxy));
        ValidatorAnnounce validatorAnnounce = new ValidatorAnnounce(
            address(mailbox)
        );

        TestRecipient recipient = new TestRecipient();

        return
            CoreDeployment({
                interchainGasPaymaster: igp,
                mailbox: mailbox,
                proxyAdmin: admin,
                testRecipient: recipient,
                validatorAnnounce: validatorAnnounce
            });
    }
    /*
    function _buildAgentConfig(
        NetworkConfigLib.NetworkConfig memory network,
        CoreDeployment memory core
    ) private view returns (AgentConfig memory) {
        return
            AgentConfig({
                addresses: AgentAddressesConfig(
                    core.igp,
                    core.mailbox,
                    core.validatorAnnounce
                ),
                domain: network.domain,
                finalityBlocks: 1,
                index: IndexConfig({from: block.number}),
                rpcStyle: "ethereum",
                url: "" // TODO: vm.rpcUrl(chainName)
            });
    }

    function writeAgentConfig(
        NetworkConfigLib.NetworkConfig memory network,
        Vm vm,
        string memory chainName,
        AgentConfig memory agent
    ) private {
        string memory baseConfig = "config";
        vm.serializeString(
            baseConfig,
            "domain",
            vm.toString(uint256(agent.domain))
        );
        vm.serializeString(baseConfig, "rpcStyle", "ethereum");
        vm.serializeString(baseConfig, "finalityBlocks", "POPULATE_ME");

        string memory addresses = "addresses";
        vm.serializeAddress(
            addresses,
            "mailbox",
            address(agent.addresses.mailbox)
        );
        vm.serializeString(
            baseConfig,
            "addresses",
            vm.serializeAddress(
                addresses,
                "interchainGasPaymaster",
                address(agent.addresses.igp)
            )
        );
        vm.serializeString(
            baseConfig,
            "addresses",
            vm.serializeAddress(
                addresses,
                "validatorAnnounce",
                address(agent.addresses.validatorAnnounce)
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
            vm.serializeString(index, "from", vm.toString(agent.index.from))
        );

        vm.serializeString(baseConfig, "name", chainName);

        vm
            .serializeString(
                "topLevel",
                "chains",
                vm.serializeString(
                    "chainLevel",
                    chainName,
                    vm.serializeString(baseConfig, "protocol", "ethereum")
                )
            )
            .write(
                string.concat(
                    _deploymentFilepath(network, vm, chainName),
                    "-agent.json"
                )
            );
    }
    */
}
