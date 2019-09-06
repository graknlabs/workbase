import GraknClient from 'grakn-client';
import interval from 'interval-promise';
import assert from 'assert';
import { execSync } from 'child_process';
import { waitUntil } from './utils';
import { getNodePosition } from './canvas';

export const selectKeyspace = async (keyspace, app) => {
  await app.client.click('.keyspaces');
  await assert.doesNotReject(async () => waitUntil(async () => app.client.isExisting('.top-bar-container .keyspaces-list')), true);
  await assert.doesNotReject(async () => waitUntil(async () => app.client.isExisting(`#${keyspace}`)));
  await app.client.click(`#${keyspace}`);
  await assert.doesNotReject(async () => waitUntil(async () => (await app.client.$('.keyspaces').getText()) === keyspace));
};

export const clearInput = async (selector, app) => {
  await app.client.click(selector);
  await app.client.click(selector);
  await app.client.click(selector);
  await app.client.click(selector);

  await app.client.keys(['Backspace']);
  assert.equal(await app.client.getValue(selector), '');
};

export const waitForQueryCompletion = async (app) => {
  await assert.doesNotReject(async () => waitUntil(async () => app.client.isExisting('.bp3-spinner-animation')), 'waitForQueryCompletion failed');
  await assert.doesNotReject(async () => waitUntil(async () => !(await app.client.isExisting('.bp3-spinner-animation'))), 'waitForQueryCompletion failed');
};

export const waitForNotificationToDisapear = async (app) => {
  await assert.doesNotReject(async () => waitUntil(async () => app.client.isExisting('.toasted.info')));
  await assert.doesNotReject(async () => waitUntil(async () => !(await app.client.isExisting('.toasted.info'))));
};

export const loadKeyspace = (keyspaceName) => {
  execSync(`grakn console -k ${keyspaceName} -f $(pwd)/test/helpers/${keyspaceName}.gql`);
};

export const cleanKeyspace = async (keyspaceName) => {
  const client = new GraknClient('localhost:48555');
  await client.keyspaces().delete(keyspaceName);
};

export const doubleClick = async (selector, coordinates, app) => {
  await app.client.click(selector, coordinates.x, coordinates.y);
  await app.client.click(selector, coordinates.x, coordinates.y);
};


export const waitForNodeToStabalize = async (nodeId, app) => new Promise(async (resolve, reject) => {
  let isStabalized = false;
  let currentCoordinates = await getNodePosition(nodeId, app);

  await interval(async (iteration, stop) => {
    const newCoordinates = await getNodePosition(nodeId, app);
    if (newCoordinates.x === currentCoordinates.x && newCoordinates.y === currentCoordinates.y) {
      isStabalized = true;
      stop();
    }
    currentCoordinates = newCoordinates;
  }, 100);

  if (isStabalized) return resolve();
  return reject();
});