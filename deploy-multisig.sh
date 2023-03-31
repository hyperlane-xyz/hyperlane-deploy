# Private key of the deployer. All the ownerships are transferred to the Owner after deployment.
export PRIVATE_KEY=<PRIVATE_KEY>

# Admin wallet of the deployed MultisigIsm.
export OWNER=<ADDRESS>

# RPC for a chain that receives messages FROM 'khalanitestnet'
# Example: export RPC_URL=https://goerli-rollup.arbitrum.io/rpc
export RPC_URL=<RPC_URL>

export REMOTES=khalanitestnet

forge script scripts/DeployMultisigIsm.s.sol --broadcast --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy