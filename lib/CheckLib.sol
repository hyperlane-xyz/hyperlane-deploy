// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/console.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";

library CheckLib {
    function check(
        ConfigLib.HyperlaneDomainConfig memory config,
        ConfigLib.MultisigIsmConfig memory ismConfig
    ) internal view {
        checkOwners(config);
        checkAdmins(config);
        checkMailboxIsm(config, ismConfig);
        console.log(
            "Succesfully checked Hyperlane deployment for %s",
            config.chainName
        );
    }

    function checkOwners(
        ConfigLib.HyperlaneDomainConfig memory config
    ) private view {
        require(
            config.admin.owner() == config.owner,
            "ProxyAdmin owner misconfigured"
        );
        require(
            config.igp.owner() == config.owner,
            "InterchainGasPaymaster owner misconfigured"
        );
        require(
            config.mailbox.owner() == config.owner,
            "Mailbox owner misconfigured"
        );
    }

    function checkAdmins(
        ConfigLib.HyperlaneDomainConfig memory config
    ) private view {
        require(
            config.admin.getProxyAdmin(
                TransparentUpgradeableProxy(payable(address(config.igp)))
            ) == address(config.admin),
            "InterchainGasPaymaster proxy admin misconfigured"
        );
        require(
            config.admin.getProxyAdmin(
                TransparentUpgradeableProxy(payable(address(config.mailbox)))
            ) == address(config.admin),
            "Mailbox proxy admin misconfigured"
        );
    }

    function checkMailboxIsm(
        ConfigLib.HyperlaneDomainConfig memory config,
        ConfigLib.MultisigIsmConfig memory ismConfig
    ) private view {
        MultisigIsm ism = MultisigIsm(address(config.mailbox.defaultIsm()));
        check(ismConfig, ism, config.owner);
    }

    function contains(
        address[] memory set,
        address element
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < set.length; i++) {
            if (set[i] == element) {
                return true;
            }
        }
        return false;
    }

    function check(
        ConfigLib.MultisigIsmConfig memory config,
        MultisigIsm ism,
        address owner
    ) internal view {
        require(ism.owner() == owner, "MultisigIsm owner misconfigured");
        for (uint256 i = 0; i < config.domains.length; i++) {
            ConfigLib.MultisigIsmDomainConfig memory domain = config.domains[i];
            require(
                domain.threshold == ism.threshold(domain.domainId),
                string.concat(
                    "Default MultisigIsm threshold misconfigured for",
                    domain.chainName
                )
            );
            address[] memory validators = ism.validators(domain.domainId);
            require(domain.validators.length == validators.length);
            for (uint256 j = 0; j < validators.length; j++) {
                require(
                    contains(domain.validators, validators[j]),
                    string.concat(
                        "Default MultisigIsm validator set misconfigured for ",
                        domain.chainName
                    )
                );
            }
        }
    }
}
