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
  OPEN_GRAKN_TX,
  LOAD_NEIGHBOURS,
  LOAD_ATTRIBUTES,
} from '@/components/shared/StoresActions';
import logger from '@/../Logger';

import {
  addResetGraphListener,
  loadMetaTypeInstances,
  validateQuery,
  computeAttributes,
  mapAnswerToExplanationQuery,
  getNeighboursData,
} from '../VisualiserUtils';
import QuerySettings from '../RightBar/SettingsTab/QuerySettings';
import VisualiserGraphBuilder from '../VisualiserGraphBuilder';
import VisualiserCanvasEventsHandler from '../VisualiserCanvasEventsHandler';
import CDB from '../../shared/CanvasDataBuilder';

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
      commit('graknSession', await rootState.grakn.session(keyspace));
      dispatch(UPDATE_METATYPE_INSTANCES);
    }
  },

  async [UPDATE_METATYPE_INSTANCES]({ dispatch, commit }) {
    const graknTx = await dispatch(OPEN_GRAKN_TX);
    const metaTypeInstances = await loadMetaTypeInstances(graknTx);
    graknTx.close();
    commit('metaTypeInstances', metaTypeInstances);
  },

  [OPEN_GRAKN_TX]({ state }) {
    return state.graknSession.transaction().write();
  },

  async [UPDATE_NODES_LABEL]({ state, dispatch }, type) {
    const graknTx = await dispatch(OPEN_GRAKN_TX);
    const nodes = await Promise.all(state.visFacade.getAllNodes().filter(x => x.type === type).map(x => graknTx.getConcept(x.id)));
    const updatedNodes = await VisualiserGraphBuilder.prepareNodes(nodes);
    state.visFacade.updateNode(updatedNodes);
    graknTx.close();
  },

  [UPDATE_NODES_COLOUR]({ state }, type) {
    const nodes = state.visFacade.getAllNodes().filter(x => x.type === type);
    const updatedNodes = nodes.map(node => Object.assign(node, state.visStyle.computeNodeStyle(node)));
    state.visFacade.updateNode(updatedNodes);
  },

  async [LOAD_NEIGHBOURS]({ state, commit, dispatch }, { visNode, neighboursLimit }) {
    commit('loadingQuery', true);
    const graknTx = await dispatch(OPEN_GRAKN_TX);
    const data = await getNeighboursData(visNode, graknTx, neighboursLimit);
    visNode.offset += neighboursLimit;
    state.visFacade.updateNode(visNode);
    state.visFacade.addToCanvas(data);
    if (data.nodes.length) state.visFacade.fitGraphToWindow();
    commit('updateCanvasData');
    const labelledNodes = await VisualiserGraphBuilder.prepareNodes(data.nodes);
    const styledNodes = labelledNodes.map(node => Object.assign(node, state.visStyle.computeNodeStyle(node)));
    state.visFacade.updateNode(styledNodes);
    const nodesWithAttribtues = await computeAttributes(data.nodes);
    state.visFacade.updateNode(nodesWithAttribtues);
    graknTx.close();
    commit('loadingQuery', false);
  },

  async [RUN_CURRENT_QUERY]({ state, dispatch, commit }) {
    try {
      const query = state.currentQuery;
      validateQuery(query);
      commit('loadingQuery', true);
      const graknTx = await dispatch(OPEN_GRAKN_TX);
      const result = (await (await graknTx.query(query)).collect());

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

        const instancesData = await CDB.buildInstances(result);
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

      nodes = await computeAttributes(nodes);

      state.visFacade.updateNode(nodes);

      commit('loadingQuery', false);

      graknTx.close();

      return { nodes, edges };
    } catch (e) {
      console.log(e);
      logger.error(e.stack);
      commit('loadingQuery', false);
      throw e;
    }
  },
  async [LOAD_ATTRIBUTES]({ state, commit, dispatch }, { visNode, neighboursLimit }) {
    commit('loadingQuery', true);
    const query = `match $x id ${visNode.id}, has attribute $y; get $y; offset ${visNode.attrOffset}; limit ${neighboursLimit};`;
    state.visFacade.updateNode({ id: visNode.id, attrOffset: visNode.attrOffset + neighboursLimit });

    const graknTx = await dispatch(OPEN_GRAKN_TX);
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
    data.nodes = await computeAttributes(data.nodes);
    state.visFacade.updateNode(data.nodes);
    commit('loadingQuery', false);
    graknTx.close();

    if (data) { // when attributes are found, construct edges and add to graph
      const edges = data.nodes.map(attr => ({ from: visNode.id, to: attr.id, label: 'has' }));

      state.visFacade.addToCanvas({ nodes: data.nodes, edges });
      commit('updateCanvasData');
    }
  },
  async [EXPLAIN_CONCEPT]({ state, dispatch, getters, commit }) {
    const explanation = getters.selectedNode.explanation;

    let queries;
    // If the explanation is formed from a conjuction inside a rule, go one step deeper to access the actual explanation
    if (!explanation.queryPattern().length) {
      queries = explanation.answers().map(answer => answer.explanation().answers().map(answer => mapAnswerToExplanationQuery(answer))).flatMap(x => x);
    } else {
      queries = getters.selectedNode.explanation.answers().map(answer => mapAnswerToExplanationQuery(answer));
    }

    /* eslint-disable no-await-in-loop */
    for (const query of queries) { // eslint-disable-line
      commit('loadingQuery', true);
      const graknTx = await dispatch(OPEN_GRAKN_TX);
      const result = (await (await graknTx.query(query)).collect());


      const data = await CDB.buildInstances(result);

      const rpData = await CDB.buildRPInstances(result, false, graknTx);
      data.nodes.push(...rpData.nodes);
      data.edges.push(...rpData.edges);

      state.visFacade.addToCanvas(data);
      commit('updateCanvasData');
      const nodesWithAttributes = await computeAttributes(data.nodes);
      graknTx.close();

      state.visFacade.updateNode(nodesWithAttributes);
      const styledEdges = data.edges.map(edge => Object.assign(edge, state.visStyle.computeExplanationEdgeStyle()));
      state.visFacade.updateEdge(styledEdges);
      commit('loadingQuery', false);
    }
  },

  async [DELETE_SELECTED_NODES]({ state, commit }) {
    state.selectedNodes.forEach((node) => {
      state.visFacade.deleteNode(node);
    });
    commit('selectedNodes', null);
  },
};
