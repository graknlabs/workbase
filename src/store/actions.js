/*
 * Copyright (C) 2021 Vaticle
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import { TypeDB } from 'typedb-client/TypeDB';
import { TypeDBCredential } from 'typedb-client/api/connection/TypeDBCredential';
import ServerSettings from '@/components/ServerSettings';

export const loadDatabases = async (context) => {
  try {
    const resp = (await global.typedb.databases().all()).map(db => db.name());
    context.commit('setIsTypeDBRunning', true);
    context.commit('setDatabases', resp);
  } catch (e) {
    context.commit('setIsTypeDBRunning', false);
    console.error('Failed to load databases', e);
  }
};

export const createDatabase = async (context, name) => {
  await global.typedb.databases().create(name).then(() => { context.dispatch('loadDatabases'); });
};

export const deleteDatabase = async (context, name) => global.typedb.databases().get(name)
  .then(db => db.delete())
  .then(() => context.dispatch('loadDatabases'));

export const initTypeDB = async (context, isCluster) => {
  try {
    global.typedb = isCluster ?
        await TypeDB.clusterClient(
            [ServerSettings.getServerUri()],
            ServerSettings.getRootCAPath() ?
                new TypeDBCredential(ServerSettings.getUsername(), ServerSettings.getPassword(), ServerSettings.getRootCAPath()) :
                new TypeDBCredential(ServerSettings.getUsername(), ServerSettings.getPassword())
        ) :
        TypeDB.coreClient(ServerSettings.getServerUri());
    context.dispatch('loadDatabases');
  } catch (e) {
    context.commit('setIsTypeDBRunning', false);
    console.error('Failed to initialise typedb client', e);
  }
};

export const logout = async (context) => {
  context.commit('setCredentials', undefined);
  context.commit('setDatabases', undefined);
  context.commit('userLogged', false);
  // Need to notify all the other states that they need to invalidate TypeDBClient
};
