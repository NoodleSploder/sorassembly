// Copyright 2018-2020 @paritytech/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { ApiPromise, WsProvider } from '@polkadot/api';
import type { BlockNumber } from '@polkadot/types/interfaces/runtime';
import { getSpecTypes } from '@polkadot/types-known';
import { Hash } from '@polkadot/types/interfaces';
import { logger } from '@polkadot/util';

import { prisma } from './generated/prisma-client';
import { nomidotTasks } from './tasks';
import { Cached } from './tasks/types';
import getEnvVars from './util/getEnvVars';
import {waitFinalized, reachedLimitLag, waitLagLimit} from './util/wait';

const envVars = getEnvVars();
const ARCHIVE_NODE_ENDPOINT = envVars.ARCHIVE_NODE_ENDPOINT;
const MAX_LAG = envVars.MAX_LAG;
const BLOCK_IDENTIFIER = envVars.BLOCK_IDENTIFIER;
const START_FROM = envVars.START_FROM;

const l = logger('node-watcher');

export async function nodeWatcher(): Promise<unknown> {
  return new Promise((_, reject) => {
    let keepLooping = true;

    const provider = new WsProvider(ARCHIVE_NODE_ENDPOINT);

    ApiPromise.create({ provider })
      .then(async api => {
        api.once('error', e => {
          keepLooping = false;
          api.disconnect();
          reject(new Error(`Api error: ${e}`));
        });

        api.once('disconnected', e => {
          keepLooping = false;
          api.disconnect();
          reject(new Error(`Api disconnected: ${e}`));
        });

        let blockIndexId = '';
        let blockIndex = START_FROM;
        let currentSpecVersion = api.createType('u32', 0);
        const lastKnownBestFinalized = (
          await api.derive.chain.bestNumberFinalized()
        ).toNumber();
        let lastKnownBestBlock = (
          await api.derive.chain.bestNumber()
        ).toNumber();

        const existingBlockIndex = await prisma.blockIndexes({
          where: {
            identifier: BLOCK_IDENTIFIER,
          },
        });

        if (existingBlockIndex.length === 0) {
          const result = await prisma.createBlockIndex({
            identifier: BLOCK_IDENTIFIER,
            startFrom: blockIndex,
            index: blockIndex,
          });

          blockIndexId = result.id;
        } else {
          blockIndexId = existingBlockIndex[0].id;
          blockIndex = existingBlockIndex[0].index;
        }

        /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
        while (keepLooping) {
          if (MAX_LAG) {
            // if we reached the last finalized block
            // MAX_LAG is set but we haven't reached the lag limit yet, we need to wait
            if (
              blockIndex > lastKnownBestFinalized &&
              !reachedLimitLag(blockIndex, lastKnownBestBlock)
            ) {
              l.warn(
                `Waiting for finalization or a max lag of ${MAX_LAG} blocks.`
              );
              const { unsub, bestBlock } = await waitLagLimit(api, blockIndex);
              unsub && unsub();
              lastKnownBestBlock = bestBlock;
              continue;
            }
          } else {
            // MAX_LAG isn't set, only the finalization matters
            if (blockIndex > lastKnownBestFinalized) {
              l.warn('Waiting for finalization.');
              const { unsub, bestFinalizedBlock } = await waitFinalized(
                api,
                lastKnownBestFinalized
              );
              unsub && unsub();
              lastKnownBestBlock = bestFinalizedBlock;
              continue;
            }
          }

          l.warn(`blockIndex: ${blockIndex}`);
          l.warn(`lastKnownBestBlock: ${lastKnownBestBlock}`);
          l.warn(`lastKnownBestFinalized: ${lastKnownBestFinalized}`);

	  //const blockNumber: BlockNumber;

          const blockNumber: BlockNumber = api.createType(
            'BlockNumber',
            blockIndex
          );
          l.warn(`block: ${blockNumber}`);

          const blockHash: Hash = await api.rpc.chain.getBlockHash(blockNumber);
          l.warn(`hash: ${blockHash}`);

          // check spec version
          const runtimeVersion = await api.rpc.state.getRuntimeVersion(
            blockHash
          );
          const newSpecVersion = runtimeVersion.specVersion;

          // if spec version was bumped, update metadata in api registry
          if (newSpecVersion.gt(currentSpecVersion)) {
            l.warn(
              `bumped spec version to ${newSpecVersion}, fetching new metadata`
            );
            const rpcMeta = await api.rpc.state.getMetadata(blockHash);
            currentSpecVersion = newSpecVersion;

            // based on the node spec & chain, inject specific type overrides
            const chain = await api.rpc.system.chain();
            api.registry.register(
              getSpecTypes(
                api.registry,
                chain,
                runtimeVersion.specName,
                runtimeVersion.specVersion
              )
            );
            api.registry.setMetadata(rpcMeta);
          }

          const [events, sessionIndex] = await Promise.all([
            await api.query.system.events.at(blockHash),
            await api.query.session.currentIndex.at(blockHash),
          ]);

          const cached: Cached = {
            events,
            sessionIndex,
          };

          // execute watcher tasks
          for await (const task of nomidotTasks) {
            l.warn(`Task --- ${task.name}`);

            const result = await task.read(blockHash, cached, api);

            try {
              l.warn(`Writing: ${JSON.stringify(result)}`);
              await task.write(blockNumber, result);
            } catch (e) {
              // Write task might throw errors such as unique constraints violated,
              // we ignore those.
              l.error(e);
            }
          }

          blockIndex += 1;

          await prisma.updateBlockIndex({
            data: {
              index: blockIndex,
            },
            where: {
              id: blockIndexId,
            },
          });
        }
      })
      .catch(e => {
        keepLooping = false;
        reject(new Error(`Connection error: ${e}`));
      });
  });
}
