// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/console.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {DeployLib} from "../lib/DeployLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {IInterchainSecurityModule} from "@hyperlane-xyz/core/interfaces/IInterchainSecurityModule.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

library CheckLib {
    struct AddressAssertion {
        address actual;
        address expected;
    }
    struct Uint256Assertion {
        uint256 actual;
        uint256 expected;
    }

    // generic
    error Owner(Ownable ownable, AddressAssertion assertion);
    error Admin(TransparentUpgradeableProxy admin, AddressAssertion assertion);

    // mailbox
    error DefaultIsm(Mailbox mailbox, AddressAssertion assertion);

    function check(
        DeployLib.Core memory core,
        ConfigLib.Core memory config
    ) internal view {
        address adminOwner = core.admin.owner();
        if (adminOwner != config.owner) {
            revert Owner(
                core.admin,
                AddressAssertion(adminOwner, config.owner)
            );
        }
        address igpOwner = core.igp.owner();
        if (igpOwner != config.owner) {
            revert Owner(
                Ownable(address(core.igp)),
                AddressAssertion(igpOwner, config.owner)
            );
        }
        address mailboxOwner = core.mailbox.owner();
        if (mailboxOwner != config.owner) {
            revert Owner(
                Ownable(address(core.mailbox)),
                AddressAssertion(mailboxOwner, config.owner)
            );
        }

        TransparentUpgradeableProxy igpProxy = TransparentUpgradeableProxy(
            payable(address(core.igp))
        );
        address igpAdmin = core.admin.getProxyAdmin(igpProxy);
        if (igpAdmin != address(core.admin)) {
            revert Admin(
                igpProxy,
                AddressAssertion(igpAdmin, address(core.admin))
            );
        }
        TransparentUpgradeableProxy mailboxProxy = TransparentUpgradeableProxy(
            payable(address(core.mailbox))
        );
        address mailboxAdmin = core.admin.getProxyAdmin(mailboxProxy);
        if (mailboxAdmin != address(core.admin)) {
            revert Admin(
                mailboxProxy,
                AddressAssertion(mailboxAdmin, address(core.admin))
            );
        }

        IInterchainSecurityModule defaultIsm = core.mailbox.defaultIsm();
        if (defaultIsm != config.defaultIsm) {
            revert DefaultIsm(
                core.mailbox,
                AddressAssertion(
                    address(defaultIsm),
                    address(config.defaultIsm)
                )
            );
        }
    }

    error Threshold(MultisigIsm ism, uint32 domain, Uint256Assertion assertion);
    struct AddressSetAssertion {
        address[] actual;
        address[] expected;
    }
    error ValidatorSet(MultisigIsm ism, uint32 domain, AddressSetAssertion);

    function check(
        MultisigIsm ism,
        ConfigLib.Multisig memory config
    ) internal view {
        address ismOwner = ism.owner();
        if (ismOwner != config.owner) {
            revert Owner(ism, AddressAssertion(ismOwner, config.owner));
        }
        for (uint256 i = 0; i < config.domains.length; i++) {
            MultisigIsm.DomainConfig memory domainConfig = config.domains[i];
            uint256 threshold = ism.threshold(domainConfig.domain);
            if (threshold != domainConfig.threshold) {
                revert Threshold(
                    ism,
                    domainConfig.domain,
                    Uint256Assertion(threshold, domainConfig.threshold)
                );
            }
            address[] memory validators = ism.validators(domainConfig.domain);
            if (
                keccak256(abi.encodePacked(validators)) !=
                keccak256(abi.encodePacked(domainConfig.validators))
            ) {
                revert ValidatorSet(
                    ism,
                    domainConfig.domain,
                    AddressSetAssertion(validators, domainConfig.validators)
                );
            }
        }
    }
}
