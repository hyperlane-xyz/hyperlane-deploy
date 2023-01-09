// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/console.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";

library CheckLib {
    function check(
        DeployLib.Core memory core,
        ConfigLib.Core memory config
    ) internal view {
        require(
            core.admin.owner() == config.owner,
            "ProxyAdmin owner misconfigured"
        );
        require(
            core.igp.owner() == config.owner,
            "InterchainGasPaymaster owner misconfigured"
        );
        require(
            core.mailbox.owner() == config.owner,
            "Mailbox owner misconfigured"
        );
        require(
            core.admin.getProxyAdmin(
                TransparentUpgradeableProxy(payable(address(core.igp)))
            ) == address(core.admin),
            "InterchainGasPaymaster proxy admin misconfigured"
        );
        require(
            core.admin.getProxyAdmin(
                TransparentUpgradeableProxy(payable(address(core.mailbox)))
            ) == address(core.admin),
            "Mailbox proxy admin misconfigured"
        );
        require(
            core.mailbox.defaultIsm() == config.ism,
            "Mailbox default ISM misconfigured"
        );
    }

    function check(
        MultisigIsm ism,
        ConfigLib.Multisig memory config
    ) internal {
        require(ism.owner() == config.owner, "Owner misconfigured");
        for (uint256 i = 0; i < config.domains.length; i++) {
            MultisigIsm.DomainConfig memory domainConfig = config.domains[i];
            require(
                domainConfig.threshold == ism.threshold(domainConfig.domain),
                "Threshold misconfigured for"
            );
            address[] memory validators = ism.validators(domainConfig.domain);
            require(domainConfig.validators.length == validators.length, "Validator set misconfigured");
            for (uint256 j = 0; j < validators.length; j++) {
                require(domainConfig.validators[j] == validators[j], "Validator misconfigured");
            }
        }
    }
}
