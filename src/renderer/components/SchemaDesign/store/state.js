import VisStyle from '../Style';

export default {
  metaTypeInstances: {},
  visStyle: VisStyle,
  visFacade: undefined,
  currentKeyspace: null,
  selectedNodes: null,
  loadingSchema: false,
  canvasData: { entities: 0, attributes: 0, relations: 0 },
  contextMenu: { show: false, x: null, y: null },
  schemaHandler: undefined,
};
