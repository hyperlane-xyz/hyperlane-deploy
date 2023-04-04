# Hyperlane Deploy

This repository contains scripts and tools to deploy Hyperlane and its popular extensions to any EVM-compatible chain.

## Hyperlane Overview

Hyperlane is an interchain messaging protocol that allows applications to communicate between blockchains.

Developers can use Hyperlane to share state between blockchains, allowing them to build interchain applications that live natively across multiple chains.

To read more about interchain applications, how the protocol works, and how to integrate with Hyperlane, please see the [documentation](https://docs.hyperlane.xyz).

## Setup

```bash
yarn install
```

## Deploying Hyperlane

See below for instructions on using the scripts in this repo to deploy a Hyperlane core instance. For more details see the [deploy documentation](https://docs.hyperlane.xyz/docs/deploy/deploy-hyperlane).

### Deploying Core Contracts

If you're deploying to a new chain not already in the [default Hyperlane chain set](https://docs.hyperlane.xyz/docs/resources/domains), ensure there is a corresponding entry `config/chains.ts`, `config/multisig_ism.ts`, and `config/start_blocks.ts`.

This script is used to deploy the following core Hyperlane contracts to a new chain. The Hyperlane protocol expects exactly one instance of these contracts on every supported chain.

- `Mailbox`: for sending and receiving messages
- `ValidatorAnnounce`: for registering validators

This script also deploys the following contracts to all chains, new and existing. The Hyperlane protocol supports many instances of these contracts on every supported chains.

- `ISM (e.g. MultisigISM)`: for verifying inbound messages from remote chains
- `InterchainGasPaymaster`: for paying relayers for message delivery
- `TestRecipient`: used to test that interchain messages can be delivered

```bash
DEBUG=hyperlane* yarn ts-node script scripts/deploy-hyperlane.ts --local anvil \
  --remotes goerli sepolia \
  --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Sending Test Messages

This script is used to verify that Hyperlane messages can be sent between specified chains.

Users should have first deployed `TestRecipient` contracts to each of the specified chains.

```sh
DEBUG=hyperlane* yarn ts-node scripts/test-messages.ts \
  --chains anvil goerli sepolia \
  --key 0x6f0311f4a0722954c46050bb9f088c4890999e16b64ad02784d24b5fd6d09061
```

## Deploying Warp Routes

Warp Routes are Hyperlane's unique take on the concept of token bridging, allowing you to permissionlessly bridge any ERC20-like asset to any chain. You can combine Warp Routes with a Hyperlane deployment to create economic trade routes between any chains already connected through Hyperlane.

See below for instructions on using the scripts in this repo to deploy Hyperlane Warp Routes. For more details see the [warp route documentation](https://docs.hyperlane.xyz/docs/deploy/deploy-warp-route).

### Deploying Warp Contracts

Establishing a warp route requires deployment of `HypERC20` contracts to the desired chains. If any chains are not already in the [default Hyperlane chain set](https://docs.hyperlane.xyz/docs/resources/domains), ensure there is an entry for them in `config/chains.ts`.

The deployment also require details about the existing (collateral) token and the new synthetics that will be created. Ensure there are entries for them in `config/warp_tokens.ts`.

```sh
DEBUG=hyperlane* yarn ts-node scripts/deploy-warp-routes.ts \
  --key 0x6f0311f4a0722954c46050bb9f088c4890999e16b64ad02784d24b5fd6d09061
```

### Sending a Test Transfer

TODO

### Deploying a Warp UI

If you'd like to create a web-based user interface for your warp routes, see the [Warp UI Template repository](https://github.com/hyperlane-xyz/hyperlane-warp-ui-template)