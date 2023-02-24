// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/console.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {InterchainGasPaymaster} from "@trevor/accurate-gas-oracles/igps/InterchainGasPaymaster.sol";
import {StorageGasOracle} from "@trevor/accurate-gas-oracles/igps/gas-oracles/StorageGasOracle.sol";
import {ValidatorAnnounce} from "@hyperlane-xyz/core/contracts/ValidatorAnnounce.sol";
import {ProxyAdmin} from "@hyperlane-xyz/core/contracts/upgrade/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {Create2Factory} from "@hyperlane-xyz/core/contracts/Create2Factory.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";

library DeployLib {
    function deploy(
        ConfigLib.HyperlaneDomainConfig memory config,
        ConfigLib.MultisigIsmConfig memory ismConfig
    ) internal {
        deployProxyAdmin(config);
        deployIgp(config);
        deployMailbox(config, ismConfig);
        deployTestRecipient(config);
        deployValidatorAnnounce(config);
    }

    function deployValidatorAnnounce(
        ConfigLib.HyperlaneDomainConfig memory config
    ) private {
        if (address(config.validatorAnnounce) == address(0)) {
            config.validatorAnnounce = new ValidatorAnnounce(
                address(config.mailbox)
            );
            console.log(
                "ValidatorAnnounce deployed at address %s",
                address(config.validatorAnnounce)
            );
        } else {
            console.log(
                "Found ValidatorAnnounce at address %s, skipping deployment",
                address(config.validatorAnnounce)
            );
        }
    }

    function deployProxyAdmin(
        ConfigLib.HyperlaneDomainConfig memory config
    ) private {
        if (address(config.admin) == address(0)) {
            config.admin = new ProxyAdmin();
            console.log(
                "ProxyAdmin deployed at address %s",
                address(config.admin)
            );
            config.admin.transferOwnership(config.owner);
        } else {
            console.log(
                "Found ProxyAdmin at address %s, skipping deployment",
                address(config.admin)
            );
        }
    }

    function deployIgp(ConfigLib.HyperlaneDomainConfig memory config) private {
        require(
            address(config.admin) != address(0),
            "Must deploy ProxyAdmin before InterchainGasPaymaster"
        );
        if (address(config.igp) == address(0)) {
            InterchainGasPaymaster impl = new InterchainGasPaymaster(config.owner);
            bytes memory initData = abi.encodeCall(
                InterchainGasPaymaster.initialize,
                (config.owner)
            );
            TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
                address(impl),
                address(config.admin),
                initData
            );
            console.log(
                "InterchainGasPaymaster deployed at address %s",
                address(proxy)
            );
            config.igp = InterchainGasPaymaster(address(proxy));
            config.igp.transferOwnership(config.owner);
        } else {
            console.log(
                "Found InterchainGasPaymaster at address %s, skipping deployment",
                address(config.igp)
            );
        }
    }

    // function deloyGasOrcle(ConfigLib.HyperlaneDomainConfig memory config) private {
    //     require(
    //         address(config.admin) != address(0),
    //         "Must deploy ProxyAdmin before StorageGasOracle"
    //     );
    //     require(
    //         address(config.igp) != address(0),
    //         "Must deploy IGP before StorageGasOracle"
    //     );

    //     StorageGasOracle oracle;
    //     if (address(config.gasOracle) == address(0)) {
    //         oracle = new StorageGasOracle();
    //     }  else {
    //         console.log(
    //             "Found StorageGasOracle at address %s, skipping deployment",
    //             address(config.gasOracle)
    //         );
    //         oracle = StorageGasOracle(address(config.gasOracle));
    //     }

    //     oracle.setRemoteGasData(
    //         StorageGasOracle.RemoteGasDataConfig({
    //             remoteDomain: config.domainId,
    //             gasPrice: 2 * 1e9,
    //             gasPrice: 1 * 1e9
    //         })
    //     );

    //     InterchainGasPayment.GasOracleConfig[] memory
    //         _configs = new InterchainGasPayment.GasOracleConfig[](1);
    //     _configs[0] = InterchainGasPayment.GasOracleConfig({
    //         remoteDomain: config.domainId, // TODO
    //         gasOracle: address(oracle)
    //     });
    //     config.igp.setGasOracles(_configs);
    // }

    function deployMailbox(
        ConfigLib.HyperlaneDomainConfig memory config,
        ConfigLib.MultisigIsmConfig memory ismConfig
    ) private {
        require(
            address(config.admin) != address(0),
            "Must deploy ProxyAdmin before Mailbox"
        );
        if (address(config.mailbox) == address(0)) {
            MultisigIsm ism = deploy(ismConfig, config.owner);

            Mailbox mailbox = new Mailbox(config.domainId);
            bytes memory initData = abi.encodeCall(
                Mailbox.initialize,
                (config.owner, address(ism))
            );
            TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
                address(mailbox),
                address(config.admin),
                initData
            );
            console.log("Mailbox deployed at address %s", address(proxy));
            config.mailbox = Mailbox(address(proxy));
        } else {
            console.log(
                "Found Mailbox at address %s, skipping deployment",
                address(config.igp)
            );
        }
    }

    function deployTestRecipient(
        ConfigLib.HyperlaneDomainConfig memory config
    ) private {
        if (address(config.testRecipient) == address(0)) {
            config.testRecipient = new TestRecipient();
            console.log(
                "TestRecipient deployed at address %s",
                address(config.testRecipient)
            );
        } else {
            console.log(
                "Found TestRecipient at address %s, skipping deployment",
                address(config.igp)
            );
        }
    }

    function deploy(
        ConfigLib.MultisigIsmConfig memory config,
        address owner
    ) internal returns (MultisigIsm) {
        // Deploy a default MultisigIsm and enroll validators for remote
        // networks.
        MultisigIsm ism = new MultisigIsm();
        console.log("MultisigIsm deployed at address %s", address(ism));
        uint32[] memory remoteDomainIds = new uint32[](config.domains.length);
        uint8[] memory remoteThresholds = new uint8[](config.domains.length);
        address[][] memory remoteValidators = new address[][](
            config.domains.length
        );
        for (uint256 i = 0; i < config.domains.length; i++) {
            remoteDomainIds[i] = config.domains[i].domainId;
            remoteThresholds[i] = config.domains[i].threshold;
            remoteValidators[i] = config.domains[i].validators;
        }
        ism.enrollValidators(remoteDomainIds, remoteValidators);
        ism.setThresholds(remoteDomainIds, remoteThresholds);
        ism.transferOwnership(owner);
        return ism;
    }

    function deploy(
        ConfigLib.HyperlaneDomainConfig memory config,
        ConfigLib.GasOracleConfigs memory gasConfig
    ) internal returns (StorageGasOracle[] memory) {
        require(
            address(config.admin) != address(0),
            "Must deploy ProxyAdmin before StorageGasOracle"
        );
        require(
            address(config.igp) != address(0),
            "Must deploy IGP before StorageGasOracle"
        );
        StorageGasOracle[] memory oracle = new StorageGasOracle[](gasConfig.remotes.length);
        InterchainGasPayment.GasOracleConfig[] memory
            _configs = new InterchainGasPayment.GasOracleConfig[](gasConfig.remotes.length);

        for (uint256 i = 0; i < gasConfig.remotes.length; i++) {
            oracle[i].setRemoteGasData(
                StorageGasOracle.RemoteGasDataConfig({
                    remoteDomain: gasConfig.remotes[i].domainId,
                    tokenExchangeRate: gasConfig.remotes[i].tokenExchangePrice,
                    gasPrice: gasConfig.remotes[i].gasPrice
                })
            );
            _configs[i] = InterchainGasPayment.GasOracleConfig({
                remoteDomain: gasConfig.remotes[i].domainId,
                gasOracle: address(oracle[i])
            });
        }
        config.igp.setGasOracles(_configs);
        return oracle;
    }
}
