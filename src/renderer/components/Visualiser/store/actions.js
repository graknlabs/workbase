/* eslint-disable no-unused-vars */
import {
  RUN_CURRENT_QUERY,
  EXPLAIN_CONCEPT,
  UPDATE_NODES_LABEL,
  UPDATE_NODES_COLOUR,
  UPDATE_METATYPE_INSTANCES,
  INITIALISE_VISUALISER,
  CURRENT_KEYSPACE_CHANGED,
  CANVAS_RESET,
  DELETE_SELECTED_NODES,
  LOAD_NEIGHBOURS,
  LOAD_ATTRIBUTES,
} from '@/components/shared/StoresActions';
import logger from '@/../Logger';

import {
  addResetGraphListener,
  loadMetaTypeInstances,
  validateQuery,
  computeAttributes,
  getNeighbourAnswers,
} from '../VisualiserUtils';
import QuerySettings from '../RightBar/SettingsTab/QuerySettings';
import VisualiserGraphBuilder from '../VisualiserGraphBuilder';
import VisualiserCanvasEventsHandler from '../VisualiserCanvasEventsHandler';
import CDB from '../../shared/CanvasDataBuilder';
import { reopenTransaction } from '../../shared/SharedUtils';


const collect = (array, current) => array.concat(current);

export default {
  [INITIALISE_VISUALISER]({ state, commit, dispatch }, { container, visFacade }) {
    addResetGraphListener(dispatch, CANVAS_RESET);
    commit('setVisFacade', visFacade.initVisualiser(container, state.visStyle));
    VisualiserCanvasEventsHandler.registerHandlers({ state, commit, dispatch });
  },

  [CANVAS_RESET]({ state, commit }) {
    state.visFacade.resetCanvas();
    commit('selectedNodes', null);
    commit('updateCanvasData');
  },

  async [CURRENT_KEYSPACE_CHANGED]({ state, dispatch, commit, rootState }, keyspace) {
    if (keyspace !== state.currentKeyspace) {
      dispatch(CANVAS_RESET);
      commit('setCurrentQuery', '');
      commit('currentKeyspace', keyspace);

      if (global.graknSession) await global.graknSession.close();
      global.graknSession = await global.grakn.session(keyspace);
      // eslint-disable-next-line no-prototype-builtins
      if (!global.graknTx) global.graknTx = {};
      if (global.graknTx[rootState.activeTab]) global.graknTx[rootState.activeTab].close();
      global.graknTx[rootState.activeTab] = await global.graknSession.transaction().write();
      dispatch(UPDATE_METATYPE_INSTANCES);
    }
  },

  async [UPDATE_METATYPE_INSTANCES]({ dispatch, commit, rootState }) {
    try {
      const graknTx = global.graknTx[rootState.activeTab];
      const metaTypeInstances = await loadMetaTypeInstances(graknTx);
      commit('metaTypeInstances', metaTypeInstances);
    } catch (e) {
      await reopenTransaction(rootState, commit);
      console.log(e);
      logger.error(e.stack);
      throw e;
    }
  },

  async [UPDATE_NODES_LABEL]({ state, dispatch, rootState }, type) {
    const nodesToUpdate = state.visFacade.getAllNodes().filter(x => x.type === type);
    const updatedNodes = await CDB.updateNodesLabel(nodesToUpdate);
    state.visFacade.updateNode(updatedNodes);
  },

  [UPDATE_NODES_COLOUR]({ state }, type) {
    const nodes = state.visFacade.getAllNodes().filter(x => x.type === type);
    const updatedNodes = nodes.map(node => Object.assign(node, state.visStyle.computeNodeStyle(node)));
    state.visFacade.updateNode(updatedNodes);
  },

  async [LOAD_NEIGHBOURS]({ state, commit, dispatch, rootState }, { visNode, neighboursLimit }) {
    try {
      commit('loadingQuery', true);
      const graknTx = global.graknTx[rootState.activeTab];

      const currentData = {
        nodes: state.visFacade.getAllNodes(),
        edges: state.visFacade.getAllEdges(),
      };

      const neighbourAnswers = await getNeighbourAnswers(visNode, currentData.edges, graknTx);
      const targetConcept = await graknTx.getConcept(visNode.id);
      const data = await CDB.buildNeighbours(targetConcept, neighbourAnswers);

      currentData.nodes.push(...data.nodes);
      currentData.edges.push(...data.edges);

      const shouldLoadRPs = QuerySettings.getRolePlayersStatus();
      if (shouldLoadRPs) {
        const rpData = await CDB.buildRPInstances(neighbourAnswers, currentData, true, graknTx);
        data.nodes.push(...rpData.nodes);
        data.edges.push(...rpData.edges);
      }

      state.visFacade.addToCanvas(data);
      if (data.nodes.length) state.visFacade.fitGraphToWindow();
      commit('updateCanvasData');
      const styledNodes = data.nodes.map(node => Object.assign(node, state.visStyle.computeNodeStyle(node)));
      state.visFacade.updateNode(styledNodes);
      const nodesWithAttribtues = await computeAttributes(data.nodes, graknTx);
      state.visFacade.updateNode(nodesWithAttribtues);
      commit('loadingQuery', false);
    } catch (e) {
      await reopenTransaction(rootState, commit);
      commit('loadingQuery', false);
      console.log(e);
      logger.error(e.stack);
      throw e;
    }
  },

  async [RUN_CURRENT_QUERY]({ state, commit, rootState }) {
    try {
      commit('setGlobalErrorMsg', '');
      const query = state.currentQuery;
      validateQuery(query);
      commit('loadingQuery', true);
      const graknTx = global.graknTx[rootState.activeTab];
      const result = await (await graknTx.query(query, { explain: true })).collect();
      if (!result.length) {
        commit('loadingQuery', false);
        return null;
      }

      const queryTypes = {
        GET: 'get',
        PATH: 'compute path',
      };

      // eslint-disable-next-line no-prototype-builtins
      const queryType = (result[0].hasOwnProperty('map') ? queryTypes.GET : queryTypes.PATH);

      let nodes = [];
      const edges = [];
      if (queryType === queryTypes.GET) {
        const shouldLoadRPs = QuerySettings.getRolePlayersStatus();
        const shouldLimit = true;

        const instancesData = await CDB.buildInstances(result, query);
        nodes.push(...instancesData.nodes);
        edges.push(...instancesData.edges);

        const typesData = await CDB.buildTypes(result);
        nodes.push(...typesData.nodes);
        edges.push(...typesData.edges);

        if (shouldLoadRPs) {
          const rpData = await CDB.buildRPInstances(result, { nodes, edges }, shouldLimit, graknTx);
          nodes.push(...rpData.nodes);
          edges.push(...rpData.edges);
        }
      } else if (queryType === queryTypes.PATH) {
        // TBD - handle multiple paths
        const path = result[0];
        const pathNodes = await Promise.all(path.list().map(id => graknTx.getConcept(id)));
        const pathData = await VisualiserGraphBuilder.buildFromConceptList(path, pathNodes);
        nodes.push(...pathData.nodes);
        edges.push(...pathData.edges);
      }

      state.visFacade.addToCanvas({ nodes, edges });
      state.visFacade.fitGraphToWindow();
      commit('updateCanvasData');

      nodes = await computeAttributes(nodes, graknTx);

      state.visFacade.updateNode(nodes);

      commit('loadingQuery', false);

      return { nodes, edges };
    } catch (e) {
      await reopenTransaction(rootState, commit);
      commit('loadingQuery', false);
      console.log(e);
      logger.error(e.stack);
      throw e;
    }
  },
  async [LOAD_ATTRIBUTES]({ state, commit, rootState }, { visNode, neighboursLimit }) {
    try {
      const graknTx = global.graknTx[rootState.activeTab];
      commit('loadingQuery', true);
      const query = `match $x id ${visNode.id}, has attribute $y; get $y; offset ${visNode.attrOffset}; limit ${neighboursLimit};`;
      state.visFacade.updateNode({ id: visNode.id, attrOffset: visNode.attrOffset + neighboursLimit });

      const result = await (await graknTx.query(query)).collect();

      const shouldLoadRPs = QuerySettings.getRolePlayersStatus();
      const shouldLimit = true;
      const data = await CDB.buildInstances(result);

      if (shouldLoadRPs) {
        const rpData = await CDB.buildRPInstances(result, shouldLimit, graknTx);
        data.nodes.push(...rpData.nodes);
        data.edges.push(...rpData.edges);
      }
      state.visFacade.addToCanvas(data);
      data.nodes = await computeAttributes(data.nodes, graknTx);
      state.visFacade.updateNode(data.nodes);
      commit('loadingQuery', false);

      if (data) { // when attributes are found, construct edges and add to graph
        const edges = data.nodes.map(attr => CDB.getEdge(visNode, attr, CDB.edgeTypes.instance.HAS));

        state.visFacade.addToCanvas({ nodes: data.nodes, edges });
        commit('updateCanvasData');
      }
    } catch (e) {
      await reopenTransaction(rootState, commit);
      commit('loadingQuery', false);
      console.log(e);
      logger.error(e.stack);
      throw e;
    }
  },
  // eslint-disable-next-line consistent-return
  async [EXPLAIN_CONCEPT]({ state, getters, commit, rootState }) {
    try {
      const node = getters.selectedNode;
      const graknTx = global.graknTx[rootState.activeTab];

      const isRelUnassigned = (when) => {
        let isRelUnassigned = false;
        const relRegex = /(\$[^\s]*|;|{)(\s*?\(.*?\))/g;
        let relMatches = relRegex.exec(when);

        while (relMatches) {
          if (!relMatches[1].includes('$')) {
            isRelUnassigned = true;
            break;
          }
          relMatches = relRegex.exec(when);
        }

        return isRelUnassigned;
      };

      const errorUnassigneRels = ruleLabel => (
        // eslint-disable-next-line max-len
        `The 'when' body of the rule [${ruleLabel}] contains at least one unassigned relation. To see the full explanation for this concept, please redefine the rule with relation variables.`
      );

      const isTargetExplAnswer = answer => Array.from(answer.map().values()).map(concept => concept.id).some(id => id === node.id);

      const originalExpl = await node.explanation();
      const rule = originalExpl.getRule();
      const isExplJoin = !rule;
      let finalExplAnswers;

      if (!isExplJoin) {
        const when = await rule.getWhen();
        const label = await rule.label();
        if (isRelUnassigned(when)) {
          commit('setGlobalErrorMsg', errorUnassigneRels(label));
          return false;
        }

        finalExplAnswers = originalExpl.getAnswers();
      } else {
        const ruleExpl = await Promise.all(originalExpl.getAnswers().filter(answer => answer.hasExplanation() && isTargetExplAnswer(answer)).map(answer => answer.explanation()));
        const ruleDetails = await Promise.all(ruleExpl.map((explanation) => {
          const rule = explanation.getRule();
          return Promise.all([rule.label(), rule.getWhen()]);
        }));

        const violatingRule = ruleDetails.find(([, when]) => isRelUnassigned(when));
        if (violatingRule) {
          commit('setGlobalErrorMsg', errorUnassigneRels(violatingRule.label));
          return false;
        }

        finalExplAnswers = ruleExpl.map(expl => expl.getAnswers()).reduce(collect, []);
      }


      if (finalExplAnswers.length > 0) {
        const data = await CDB.buildInstances(finalExplAnswers);
        const rpData = await CDB.buildRPInstances(finalExplAnswers, data, false, graknTx);
        data.nodes.push(...rpData.nodes);
        data.edges.push(...rpData.edges);

        state.visFacade.addToCanvas(data);
        commit('updateCanvasData');
        const nodesWithAttributes = await computeAttributes(data.nodes, graknTx);

        state.visFacade.updateNode(nodesWithAttributes);
        const styledEdges = data.edges.map(edge => ({ ...edge, label: edge.hiddenLabel, ...state.visStyle.computeExplanationEdgeStyle() }));
        state.visFacade.updateEdge(styledEdges);
        commit('loadingQuery', false);
      } else {
        commit('setGlobalErrorMsg', 'The transaction has been refreshed since the loading of this node and, as a result, the explaination is incomplete.');
      }
    } catch (e) {
      await reopenTransaction(rootState, commit);
      commit('loadingQuery', false);
      console.log(e);
      logger.error(e.stack);
      throw e;
    }
  },

  async [DELETE_SELECTED_NODES]({ state, commit }) {
    state.selectedNodes.forEach((node) => {
      state.visFacade.deleteNode(node);
    });
    commit('selectedNodes', null);
  },
};
