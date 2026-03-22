// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/HandlerFactory.sol";
import "../src/SplitWise.sol";

/// @notice Deploys the HandlerFactory to Sepolia.
///         The RISC Zero Groth16 verifier is already deployed on Sepolia.
contract Deploy is Script {
    // RISC Zero Groth16 verifier on Sepolia (official deployment)
    address constant RISC_ZERO_VERIFIER = 0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        // Deploy with address(0) verifier so we skip Groth16 proof checks on-chain
        // (because the locak zkVM outputs STARK proofs which require Bonsai for conversion)
        HandlerFactory groupFactory = new HandlerFactory(
            IRiscZeroVerifier(address(0)),
            bytes32(0)
        );
        console.log("HandlerFactory:", address(groupFactory));

        vm.stopBroadcast();

        console.log("\n=== COPY THESE INTO YOUR .env ===");
        console.log("FACTORY_ADDRESS=", address(groupFactory));
        console.log("=================================");
    }
}
