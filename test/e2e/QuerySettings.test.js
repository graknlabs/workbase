import assert from 'assert';
import { startApp, stopApp } from './helpers/hooks';
import { selectKeyspace, runQuery, changeSetting } from './helpers/actions';
import { deleteKeyspace, loadKeyspace } from './helpers/utils';

jest.setTimeout(100000);

let app;

beforeAll(() => {
  loadKeyspace('gene');
});

beforeEach(async () => {
  app = await startApp();
  const isAppVisible = await app.browserWindow.isVisible();
  assert.equal(isAppVisible, true);
});

afterEach(async () => {
  await stopApp(app);
});

afterAll(async () => {
  await deleteKeyspace('gene');
});

describe('Query Settings', () => {
  test('Query Limit setting is applied', async () => {
    await selectKeyspace('gene', app);
    await changeSetting({ queryLimit: 1 }, app);
    await runQuery('match $x isa person; get;', app);
    assert.equal((await app.client.getText('.top-bar-container .CodeMirror')).trim(), 'match $x isa person; get; offset 0; limit 1;');
  });

  // TODO: these tests fail because of a bug in Grakn 1.5.8 which
  // has already been fixed on master. these must be unskipped in the
  // next version of workbase that will run against Grakn 1.5.9
  test.skip('Neighbours Limit setting is applied', async () => {
    await selectKeyspace('gene', app);
    await changeSetting({ loadRoleplayers: true, neighboursLimit: 2 }, app);
    await runQuery('match $x isa parentship; get;', app);
    assert.equal(await app.client.getText('.no-of-entities'), 'entities: 2');
  });

  test.skip('Load Neighbours enabled is applied', async () => {
    await selectKeyspace('gene', app);
    await changeSetting({ neighboursLimit: 1, loadRoleplayers: true }, app);
    await runQuery('match $x isa parentship; get;', app);
    assert.equal(await app.client.getText('.no-of-entities'), 'entities: 1');
  });

  test('Load Neighbours disabled is applied', async () => {
    await selectKeyspace('gene', app);
    await changeSetting({ loadRoleplayers: false }, app);
    await runQuery('match $x isa parentship; get;', app);
    assert.equal(await app.client.getText('.no-of-entities'), 'entities: 0');
  });
});
