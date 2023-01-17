# Hyperlane Deploy

## Overview

Hyperlane is an interchain messaging protocol that allows applications to communicate between blockchains.

Developers can use Hyperlane to share state between blockchains, allowing them to build interchain applications that live natively across multiple chains.

To read more about interchain applications, how the protocol works, and how to integrate with Hyperlane, please see the [documentation](https://docs.hyperlane.xyz/).

## Deploying Hyperlane

For more detailed instructions on how to deploy Hyperlane to the EVM chain of your choice, see docs.hyperlane.xyz.

### Setup

- Installing foundry
  See https://github.com/foundry-rs/foundry#installation

- Installing dependencies

  ```bash
  yarn install
  git submodule init && git submodule update --remote
  ```

### Deploying core contracts

This script is used to incrementally deploy the core Hyperlane smart contracts to a new chain.

If a contract address for `$LOCAL` is set to `0x0` in `./config/networks.json`, that contract will be deployed. If not, the script will assert that the contract is configured according to the config in `./config`.

If you're deploying to a new chain, ensure there is a corresponding entry for `$LOCAL` in `./config/networks.json` with all contract addresses set to `0x0`.

The script deploys:

- A `ProxyAdmin`, used to administer `TransparentUpgradableProxies` for `Mailbox` and `InterchainGasPaymaster`
- A `Mailbox`, which applications can use to send and receive messages
- A `MultisigIsm`. Applications can optionally use this ISM to verify interchain messages sent to the local chain.
- An `InterchainGasPaymaster`. Applications can optionally use this contract to pay a relayer to deliver their interchain messages to remote chains.
- A `TestRecipient`. Users can send messages to this contract to verify that everything is working properly.

```bash
# The name of the chain to deploy to. Used to configure the localDomain for the
# Mailbox contract.
export LOCAL=YOUR_CHAIN_NAME
# An RPC url for the chain to deploy to.
export RPC_URL=YOUR_CHAIN_RPC_URL
# The comma separated name(s) of the chains to receive messages from.
# Used to configure the default MultisigIsm.
export REMOTES=ethereum,polygon,avalanche,celo,arbitrum,optimism,bsc,moonbeam

# Pass whatever wallet option you would like to use https://book.getfoundry.sh/reference/forge/forge-script#wallet-options---raw
forge script scripts/DeployCore.s.sol --broadcast --rpc-url $RPC_URL
```

### Deploying a MultisigIsm

This script is used to deploy a `MultigsigIsm` to the chain of your choice. It will be initialized to verify messages from `$REMOTES` using the config for each remote chain specified in `./config/multisig_ism.json`.

Applications can optionally use this ISM to verify interchain messages.

The script will also deploy a `TestRecipient`, configured to use the deployed ISM.

```bash
# This address will wind up owning the MultisigIsm after it's deployed.
export OWNER=0x1234
# An RPC url for the chain to deploy to.
export RPC_URL=YOUR_CHAIN_RPC_URL
# The comma separated name(s) of the chain(s) to receive messages from.
export REMOTES=YOUR_CHAIN_NAME

forge script scripts/DeployMultisigIsm.s.sol --broadcast --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```
