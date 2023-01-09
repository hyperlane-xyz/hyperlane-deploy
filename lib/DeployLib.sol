// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../lib/forge-std/src/console.sol";

import {Vm} from "../lib/forge-std/src/Vm.sol";

import {ConfigLib} from "../lib/ConfigLib.sol";
import {MultisigIsm} from "@hyperlane-xyz/core/contracts/isms/MultisigIsm.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {InterchainGasPaymaster} from "@hyperlane-xyz/core/contracts/InterchainGasPaymaster.sol";
import {ProxyAdmin} from "@hyperlane-xyz/core/contracts/upgrade/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@hyperlane-xyz/core/contracts/upgrade/TransparentUpgradeableProxy.sol";
import {Create2Factory} from "@hyperlane-xyz/core/contracts/Create2Factory.sol";
import {TestRecipient} from "@hyperlane-xyz/core/contracts/test/TestRecipient.sol";

library DeployLib {
    // keys must be alphabetically sorted for JSON serialization
    // see https://book.getfoundry.sh/cheatcodes/parse-json?highlight=serialize#decoding-json-objects-into-solidity-structs
    struct Core {
        ProxyAdmin admin;
        Create2Factory create2;
        InterchainGasPaymaster igp;
        Mailbox mailbox;
        TestRecipient testRecipient;
    }

    function deploy(ConfigLib.Core memory config) internal returns (Core memory) {
        ProxyAdmin admin = new ProxyAdmin();
        admin.transferOwnership(config.owner);

        InterchainGasPaymaster igpImplementation = new InterchainGasPaymaster();
        TransparentUpgradeableProxy igpProxy = new TransparentUpgradeableProxy(
            address(igpImplementation),
            address(admin),
            abi.encodeCall(InterchainGasPaymaster.initialize, ())
        );
        InterchainGasPaymaster igp = InterchainGasPaymaster(address(igpProxy));
        igp.transferOwnership(config.owner);

        Mailbox mailboxImplementation = new Mailbox(config.domain);
        TransparentUpgradeableProxy mailboxProxy = new TransparentUpgradeableProxy(
            address(mailboxImplementation),
            address(admin),
            abi.encodeCall(Mailbox.initialize, (config.owner, address(config.ism)))
        );
        Mailbox mailbox = Mailbox(address(mailboxProxy));

        TestRecipient recipient = new TestRecipient();

        // TODO: CREATE2 factory
        return Core(admin, Create2Factory(address(0)), igp, mailbox, recipient);
    }

    function deploy(ConfigLib.Multisig memory config) internal returns (MultisigIsm) {
        return new MultisigIsm(config.domains, config.owner);
    }
}
