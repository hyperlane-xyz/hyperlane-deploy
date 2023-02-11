// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/console.sol";

import {NetworkConfigLib} from "./NetworkConfigLib.sol";
import {CoreConfigLib} from "./CoreConfigLib.sol";
import {MultisigIsmConfigLib} from "./MultisigIsmConfigLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {IInterchainSecurityModule} from "@hyperlane-xyz/core/interfaces/IInterchainSecurityModule.sol";
import {IMailbox} from "@hyperlane-xyz/core/interfaces/IMailbox.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

interface IHasMailbox {
    function mailbox() external view returns (IMailbox);
}

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

    function checkOwner(Ownable ownable, address expected) internal view {
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

    /*
    error DefaultIsm(Mailbox mailbox, AddressAssertion assertion);

    function checkIsm(
        Mailbox mailbox,
        IInterchainSecurityModule expected
    ) internal view {
        IInterchainSecurityModule ism = mailbox.defaultIsm();
        if (ism != expected) {
            revert DefaultIsm(
                mailbox,
                AddressAssertion(address(ism), address(expected))
            );
        }
    }
    */

    error WrongMailbox(IHasMailbox value, AddressAssertion assertion);

    function checkMailbox(IHasMailbox value, IMailbox expected) internal view {
        IMailbox mailbox = value.mailbox();
        if (mailbox != expected) {
            revert WrongMailbox(
                value,
                AddressAssertion(address(mailbox), address(expected))
            );
        }
    }

    function check(
        CoreConfigLib.CoreDeployment memory core,
        NetworkConfigLib.NetworkConfig memory network
    ) internal view {
        checkOwner(
            Ownable(address(core.interchainGasPaymaster)),
            network.owner
        );
        checkOwner(Ownable(address(core.mailbox)), network.owner);
        checkOwner(Ownable(address(core.proxyAdmin)), network.owner);

        // TODO: Only the ProxyAdmin can call this function
        /*
        checkAdmin(
            TransparentUpgradeableProxy(
                payable(address(core.interchainGasPaymaster))
            ),
            core.proxyAdmin
        );
        checkAdmin(
            TransparentUpgradeableProxy(payable(address(core.mailbox))),
            core.proxyAdmin
        );
        */

        checkMailbox(
            IHasMailbox(address(core.validatorAnnounce)),
            core.mailbox
        );

        // checkIsm(core.mailbox, network.defaultIsm);
    }

    error Threshold(MultisigIsm ism, uint32 domain, Uint256Assertion assertion);

    function checkThreshold(
        MultisigIsm ism,
        uint32 domain,
        uint256 expected
    ) internal view {
        uint256 threshold = ism.threshold(domain);
        if (threshold != expected) {
            revert Threshold(
                ism,
                domain,
                Uint256Assertion(threshold, expected)
            );
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
        MultisigIsmConfigLib.MultisigIsmConfig memory config
    ) internal view {
        checkOwner(ism, config.owner);

        for (uint256 i = 0; i < config.domains.length; i++) {
            MultisigIsmConfigLib.MultisigIsmDomainConfig
                memory domainConfig = config.domains[i];
            checkThreshold(ism, domainConfig.domain, domainConfig.threshold);
            checkValidators(ism, domainConfig.domain, domainConfig.validators);
        }
    }
}
