// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import {BytesLib} from "../lib/BytesLib.sol";
import {NetworkConfigLib} from "../lib/NetworkConfigLib.sol";
import {CoreConfigLib} from "../lib/CoreConfigLib.sol";
import {Mailbox} from "@hyperlane-xyz/core/contracts/Mailbox.sol";
import {TypeCasts} from "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";

contract SendTestMessage is Script {
    using TypeCasts for address;
    using BytesLib for bytes;

    function run() public {
        string memory origin = vm.envString("ORIGIN");
        string memory destination = vm.envString("DESTINATION");
        address recipient = vm.envAddress("RECIPIENT");
        string memory body = vm.envString("BODY");

        NetworkConfigLib.NetworkConfig memory network = NetworkConfigLib
            .readConfig(vm, origin);

        CoreConfigLib.CoreDeployment memory core = CoreConfigLib.readDeployment(
            vm,
            origin
        );

        vm.startBroadcast();
        bytes32 messageId = core.mailbox.dispatch(
            network.domain,
            address(recipient).addressToBytes32(),
            abi.encode(body)
        );
        console.log(
            "Sent message with ID %s from %s to %s",
            vm.toString(messageId),
            origin,
            destination
        );
        console.log(
            "https://explorer.hyperlane.xyz/message/%s",
            string(abi.encodePacked(vm.toString(messageId)).slice(2, 64))
        );
    }
}
