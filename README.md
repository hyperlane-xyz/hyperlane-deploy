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
  ```

### Deploying core contracts

This script is used to deploy the core Hyperlane smart contracts to a new chain.

The script deploys:

- A `Mailbox`, which applications can use to send and receive messages
- A `MultisigIsm`. Applications can optionally use this ISM to verify interchain messages sent to the local chain.
- An `InterchainGasPaymaster`. Applications can optionally use this contract to pay a relayer to deliver their interchain messages to remote chains.

Ensure the local network you're deploying to has an entry in `config/networks.json`, and the remote networks you'd like to support have entries in `config/networks.json` and `config/multisig_ism.json`.

```bash
# This address will wind up owning the core contracts after they're deployed.
export OWNER=0x1234
# The private key that will be used to deploy the contracts. Does not have any
# permissions post-deployment, any key with a balance will do.
export PRIVATE_KEY=0x1234
# The name of the chain to deploy to. Used to configure the localDomain for the
# Mailbox contract.
export LOCAL=YOUR_CHAIN_NAME
# An RPC url for the chain to deploy to.
export RPC_URL=YOUR_CHAIN_RPC_URL
# The comma separated name(s) of the chains to receive messages from.
# Used to configure the default MultisigIsm.
export REMOTES=ethereum,polygon,avalanche,celo,arbitrum,optimism,bsc,moonbeam

forge script scripts/DeployCore.s.sol --broadcast --rpc-url $RPC_URL
```

### Deploying a MultisigIsm

This script is used to deploy a `MultigsigIsm` to the chain of your choice.

Applications can optionally use this ISM to verify interchain messages.

```bash
# This address will wind up owning the ISM after it's deployed.
export OWNER=0x1234
# The private key that will be used to deploy the contracts. Does not have any
# permissions post-deployment, any key with a balance will do.
export PRIVATE_KEY=0x1234
# An RPC url for the chain to deploy to.
export RPC_URL=YOUR_CHAIN_RPC_URL
# The comma separated name(s) of the remote chains the MultisigIsm will verify
# messages from.
export REMOTES=ethereum,polygon,avalanche,celo,arbitrum,optimism,bsc,moonbeam

forge script scripts/DeployMultisigIsm.s.sol --broadcast --rpc-url $RPC_URL
```
