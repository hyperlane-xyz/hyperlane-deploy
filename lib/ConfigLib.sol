// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/Script.sol";
import {Vm} from "../lib/forge-std/src/Vm.sol";

import {DeployLib} from "../lib/DeployLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {InterchainGasPaymaster} from "@hyperlane-xyz/core/contracts/InterchainGasPaymaster.sol";
import {ProxyAdmin} from "@hyperlane-xyz/core/contracts/upgrade/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {Create2Factory} from "@hyperlane-xyz/core/contracts/Create2Factory.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";
import {IInterchainSecurityModule} from "@hyperlane-xyz/core/interfaces/IInterchainSecurityModule.sol";

library ConfigLib {
    using stdJson for string;

    struct Core {
        IInterchainSecurityModule defaultIsm;
        uint32 domain;
        address owner;
    }

    struct Multisig {
        MultisigIsm.DomainConfig[] domains;
        address owner;
    }

    struct Index {
        uint256 from;
    }

    // mirrors RustChainSetup in monorepo/typescript/infra/src/config/agent.ts:257
    struct Agent {
        DeployLib.Core addresses;
        uint32 domain;
        uint256 finalityBlocks;
        Index index;
        string rpcStyle;
        string url;
    }

    function readCore(
        Vm vm,
        string memory chainName
    ) internal view returns (Core memory) {
        string memory file = vm.readFile("config/networks.json");
        bytes memory chain = vm.parseJson(file, chainName);
        return abi.decode(chain, (Core));
    }

    function digest(Core memory core) internal pure returns (bytes32) {
        return keccak256(abi.encode(core));
    }

    function readMultisigIsmDomainConfig(
        Vm vm,
        string memory chainName
    ) private view returns (MultisigIsm.DomainConfig memory) {
        string memory file = vm.readFile("config/multisig_ism.json");
        bytes memory chain = vm.parseJson(file, chainName);
        return abi.decode(chain, (MultisigIsm.DomainConfig));
    }

    function readMultisigIsmConfig(
        Vm vm,
        string[] memory chainNames,
        address owner
    ) internal view returns (Multisig memory) {
        MultisigIsm.DomainConfig[]
            memory domains = new MultisigIsm.DomainConfig[](chainNames.length);
        for (uint256 i = 0; i < chainNames.length; i++) {
            domains[i] = readMultisigIsmDomainConfig(vm, chainNames[i]);
        }
        return Multisig(domains, owner);
    }

    function digest(Multisig memory multisig) internal pure returns (bytes32) {
        return keccak256(abi.encode(multisig));
    }

    // function buildAgentConfig(
    //     DeployLib.Core memory core,
    //     uint32 domain
    // ) internal view returns (Agent memory) {
    //     return
    //         Agent({
    //             addresses: core,
    //             domain: domain,
    //             finalityBlocks: 1,
    //             index: Index({from: block.number}),
    //             rpcStyle: "ethereum",
    //             url: "" // TODO: vm.rpcUrl(chainName)
    //         });
    // }
}
