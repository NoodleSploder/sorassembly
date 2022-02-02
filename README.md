# SORAssembly - (coming soon) https://sorassembly.io ![CI](https://github.com/NoodleSploder/sorassembly/workflows/CI/badge.svg?branch=master) <img width="750" alt="web3 foundation_grants_badge_black" src="https://user-images.githubusercontent.com/874046/119712025-cb8ae900-be7d-11eb-9ca7-cac14991bb5e.png">

The place to discuss and vote on SORA governance.

SORAssembly is a platform for anyone to discover and participate in SORA governance. You can browse proposals made on chain, discuss with the community and vote directly from the website using a browser extension. Proposal authors are the only one able to edit the proposal post and description. You don't have to, but adding an email may help to recover your account, also you can get notifications for discussions of interest or when a new proposal appears on-chain.

---

This repo hosts 
- auth-server: the nodeJS backend and its db responsible for user authentication.
- (coming soon) (TBD): the docker that host the discussion db as well as the graphQL server that exposes the db to the SORAssembly application.
- chain-db-watcher: a nodeJS service creating or updating the discussion db as soon as governance events happen on-chain.
- front-end: the React front-end application available on https://sorassembly.io.

`launch.sh` is a script that helps (first stop and then) launch the dockers and servers in the right order as well as applying the migrations for the different db.

## Documentation

- [SORAssembly documentation](docs/docs.md)
