// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import {BytesLib} from "../lib/BytesLib.sol";
import {ConfigLib} from "../lib/ConfigLib.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {TypeCasts} from "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";

// TODO: Maybe take recipient as an arg..
contract CheckMessage is Script {
    using TypeCasts for address;
    using BytesLib for bytes;

    function run() public view {
        string memory destination = vm.envString("DESTINATION");
        bytes32 messageId = vm.envBytes32("MESSAGE_ID");
        Mailbox mailbox = ConfigLib
            .readHyperlaneDomainConfig(vm, destination)
            .mailbox;
        bool delivered = mailbox.delivered(messageId);
        if (delivered) {
            console.log(
                "Message ID '%s' HAS been delivered to %s",
                vm.toString(messageId),
                destination
            );
        } else {
            console.log(
                "Message ID '%s' HAS NOT been delivered to %s",
                vm.toString(messageId),
                destination
            );
        }
        console.log(
            "https://explorer.hyperlane.xyz/message/%s",
            string(abi.encodePacked(vm.toString(messageId)).slice(2, 64))
        );
    }
}
