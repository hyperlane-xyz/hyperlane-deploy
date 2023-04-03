# Hyperlane Deploy

## Overview

Hyperlane is an interchain messaging protocol that allows applications to communicate between blockchains.

Developers can use Hyperlane to share state between blockchains, allowing them to build interchain applications that live natively across multiple chains.

To read more about interchain applications, how the protocol works, and how to integrate with Hyperlane, please see the [documentation](https://docs.hyperlane.xyz/).

## Deploying Hyperlane

For more detailed instructions on how to deploy Hyperlane to the EVM chain of your choice, see docs.hyperlane.xyz.

### Setup

- Installing dependencies

  ```bash
  yarn install
  ```

### Deploying contracts

If you're deploying to a new chain, ensure there is a corresponding entry `config/networks.ts` and `config/multisig_ism.ts`.

This script is used to deploy the following core Hyperlane contracts to a new chain.
The Hyperlane protocol expects exactly one instance of these contracts on every supported chain.

- A `Mailbox` for sending and receiving messages
- `ValidatorAnnounce` for registering validators

This script also deploys the following contracts to all chains, new and existing.
The Hyperlane protocol expects many instances of these contracts on every supported chains

- An `ISM` (MultisigISM) for verifying inbound messages from remote chains
- An `InterchainGasPaymaster` for paying relayers for message delivery
- A `TestRecipient` contract that can be used to test that interchain messages can be delivered

```bash
DEBUG=hyperlane* yarn ts-node script scripts/deploy.ts --local anvil \
  --remotes goerli sepolia \
  --key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Sending test messages

This script is used to verify that Hyperlane messages can be sent between specified chains.

Users should have first deployed `TestRecipient` contracts to each of the specified chains.

```
DEBUG=hyperlane* yarn ts-node scripts/test-messages.ts \
  --chains anvil goerli sepolia \
  --key 0x6f0311f4a0722954c46050bb9f088c4890999e16b64ad02784d24b5fd6d09061
```
