// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import {BytesLib} from "../lib/BytesLib.sol";
import {ConfigLib} from "../lib/ConfigLib.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {TypeCasts} from "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";

contract SendTestMessage is Script {
    using TypeCasts for address;
    using BytesLib for bytes;

    function run() public {
        uint256 senderPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory origin = vm.envString("ORIGIN");
        string memory destination = vm.envString("DESTINATION");
        string memory body = vm.envString("BODY");
        Mailbox mailbox = ConfigLib
            .readHyperlaneDomainConfig(vm, origin)
            .mailbox;
        ConfigLib.HyperlaneDomainConfig memory config = ConfigLib
            .readHyperlaneDomainConfig(vm, destination);

        vm.startBroadcast(senderPrivateKey);
        bytes32 messageId = mailbox.dispatch(
            config.domainId,
            address(config.testRecipient).addressToBytes32(),
            abi.encode(body)
        );
        console.log(
            "Sent test message '%s' from %s to %s",
            body,
            origin,
            destination
        );
        console.log(
            "https://explorer-v2.hyperlane.xyz/message/%s",
            string(abi.encodePacked(vm.toString(messageId)).slice(2, 64))
        );
    }
}
