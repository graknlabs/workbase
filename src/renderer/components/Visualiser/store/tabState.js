import VisStyle from '../Style';

export default {
  create() {
    return {
      currentQuery: '',
      metaTypeInstances: {},
      visStyle: VisStyle,
      visFacade: undefined,
      currentKeyspace: null,
      selectedNodes: null,
      loadingQuery: false,
      canvasData: { entities: 0, attributes: 0, relations: 0 },
      contextMenu: { show: false, x: null, y: null },
      globalErrorMsg: '',
    };
  },
};
