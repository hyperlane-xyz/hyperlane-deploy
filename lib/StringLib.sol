// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

library StringLib {
    function contains(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return count(a, b) > 0;
    }

    function count(
        string memory a,
        string memory b
    ) internal pure returns (uint256) {
        bytes memory _a = bytes(a);
        bytes memory _b = bytes(b);
        return count(_a, _b);
    }

    function count(
        bytes memory a,
        bytes memory b
    ) private pure returns (uint256) {
        uint256 k = 0;
        for (uint256 i = 0; i < a.length - b.length; i++) {
            for (uint256 j = 0; j < b.length; j++) {
                bool equal = (a[i + j] == b[j]);
                if (!equal) {
                    break;
                } else if (equal && j == b.length - 1) {
                    k += 1;
                }
            }
        }
        return k;
    }
}
