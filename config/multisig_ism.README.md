`multisig_ism.json` is simply a set of validators on each chain.

This file is used in 2 cases:
1. When we deploy Hyperlane Core contracts to the Khalanichain (`./deploy-khalanitestnet.sh`), 
validators for all `remote` chains specified in this file, are `enroll`-ed into `MultisigIsm` deployed to the Khalani.
This is needed to validate messages sent **FROM** remote chains.
2. When we deploy `MultisigIsm` module to chains that want to send messages **TO** Khalani. 

All the chains exception for `khalanitestnet` have validators deployed by the Hyperlane team.

The `khalanitestnet` has validators (currently, only one) deployed by Khalani team.