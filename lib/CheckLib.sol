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

    error Owner(Ownable ownable, AddressAssertion assertion);
    function checkOwner(
        Ownable ownable,
        address expected
    ) internal view {
        address owner = ownable.owner();
        if (owner != expected) {
            revert Owner(ownable, AddressAssertion(owner, expected));
        }
    }

    error Admin(TransparentUpgradeableProxy proxy, AddressAssertion assertion);
    function checkAdmin(
        TransparentUpgradeableProxy proxy,
        ProxyAdmin admin
    ) internal view {
        address actual = admin.getProxyAdmin(proxy);
        if (actual != address(admin)) {
            revert Admin(proxy, AddressAssertion(actual, address(admin)));
        }
    }

    error DefaultIsm(Mailbox mailbox, AddressAssertion assertion);
    function checkIsm(
        Mailbox mailbox,
        IInterchainSecurityModule expected
    ) internal view {
        IInterchainSecurityModule ism = mailbox.defaultIsm();
        if (ism != expected) {
            revert DefaultIsm(mailbox, AddressAssertion(address(ism), address(expected)));
        }
    }

    function check(
        DeployLib.Core memory core,
        ConfigLib.Core memory config
    ) internal view {
        checkOwner(Ownable(address(core.igp)), config.owner);
        checkOwner(Ownable(address(core.mailbox)), config.owner);
        checkOwner(Ownable(address(core.admin)), config.owner);

        checkAdmin(TransparentUpgradeableProxy(payable(address(core.igp))), core.admin);
        checkAdmin(TransparentUpgradeableProxy(payable(address(core.mailbox))), core.admin);

        checkIsm(core.mailbox, config.defaultIsm);
    }

    error Threshold(MultisigIsm ism, uint32 domain, Uint256Assertion assertion);
    function checkThreshold(
        MultisigIsm ism,
        uint32 domain,
        uint256 expected
    ) internal view {
        uint256 threshold = ism.threshold(domain);
        if (threshold != expected) {
            revert Threshold(ism, domain, Uint256Assertion(threshold, expected));
        }
    }

    struct AddressSetAssertion {
        address[] actual;
        address[] expected;
    }
    error ValidatorSet(MultisigIsm ism, uint32 domain, AddressSetAssertion);
    function checkValidators(
        MultisigIsm ism,
        uint32 domain,
        address[] memory expected
    ) internal view {
        address[] memory validators = ism.validators(domain);
        if (
            keccak256(abi.encodePacked(validators)) !=
            keccak256(abi.encodePacked(expected))
        ) {
            revert ValidatorSet(
                ism,
                domain,
                AddressSetAssertion(validators, expected)
            );
        }
    }

    function check(
        MultisigIsm ism,
        ConfigLib.Multisig memory config
    ) internal view {
        checkOwner(ism, config.owner);

        for (uint256 i = 0; i < config.domains.length; i++) {
            MultisigIsm.DomainConfig memory domainConfig = config.domains[i];
            checkThreshold(ism, domainConfig.domain, domainConfig.threshold);
            checkValidators(ism, domainConfig.domain, domainConfig.validators);
        }
    }
}
