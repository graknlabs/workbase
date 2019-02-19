const Application = require('spectron').Application;
const assert = require('assert');
const electronPath = require('electron'); // Require Electron from the binaries included in node_modules.
const path = require('path');

jest.setTimeout(30000);

const app = new Application({
  path: electronPath,
  args: [path.join(__dirname, '../../dist/electron/main.js')],
});

beforeAll(async () => app.start());

afterAll(async () => {
  if (app && app.isRunning()) {
    return app.stop();
  }
  return undefined;
});

describe('Relationships Panel', () => {
  test('initialize workbase', async () => {
    const count = await app.client.getWindowCount();
    assert.equal(count, 1);
  });

  test.skip('select keyspace', async () => {
    app.client.click('.keyspaces');
    await app.client.waitUntilWindowLoaded();

    const keyspaceList = app.client.selectByAttribute('class', 'keyspaces-list');
    assert.ok(keyspaceList);

    assert.equal(await app.client.getText('.keyspaces'), 'keyspace');

    app.client.click('#gene');

    assert.equal(await app.client.getText('.keyspaces'), 'gene');
  });

  test.skip('click on a node', async () => {
    await app.client.click('.CodeMirror');

    await app.client.keys('match $x isa person id V61528; get;');

    await sleep(1000);

    await app.client.click('.run-btn');

    await sleep(10000);

    await app.client.click('#graph-div');

    await sleep(4000);

    await assert.equal(await app.client.getText('.role-btn-text'), 'child');
    await assert.equal(await app.client.getText('.relationship-item'), 'parentship');
    await assert.equal((await app.client.getText('.role-label'))[0], 'parent');
    await assert.equal((await app.client.getText('.role-label'))[1], 'parent');
    await assert.equal((await app.client.getText('.player-value'))[0], 'person: V61472');
    await assert.equal((await app.client.getText('.player-value'))[1], 'person: V123120');
  });
});
