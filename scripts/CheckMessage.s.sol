// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import {BytesLib} from "../lib/BytesLib.sol";
import {CoreConfigLib} from "../lib/CoreConfigLib.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {TypeCasts} from "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";

// TODO: For this to work, need to populate deployments...
contract CheckMessage is Script {
    using TypeCasts for address;
    using BytesLib for bytes;

    function run() public view {
        string memory destination = vm.envString("DESTINATION");
        bytes32 messageId = vm.envBytes32("MESSAGE_ID");
        CoreConfigLib.CoreDeployment memory core = CoreConfigLib.readDeployment(
            vm,
            destination
        );
        bool delivered = core.mailbox.delivered(messageId);
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
            "https://explorer-v2.hyperlane.xyz/message/%s",
            string(abi.encodePacked(vm.toString(messageId)).slice(2, 64))
        );
    }
}
