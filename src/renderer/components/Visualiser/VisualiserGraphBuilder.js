import Style from './Style';
import NodeSettings from './RightBar/SettingsTab/DisplaySettings';

// Map graql variables and explanations to each concept
function attachExplanation(result) {
  return result.map((x) => {
    const keys = Array.from(x.map().keys());

    if (x.explanation() && x.explanation().queryPattern() === '') { // if explantion is formed from a conjuction go one level deeper and attach explanations for each answer individually
      return Array.from(x.explanation().answers()).map((ans) => {
        const exp = ans.explanation();
        const concepts = [];

        ans.map().forEach((concept, key) => {
          if (keys.includes(key)) { // only return those concepts which were asked for since the explanation.map() contains all the concepts in the query. e.g. (match $x isa person; $y isa company; get $x; => only $x should be returned)
            concept.explanation = exp;
            concept.graqlVar = key;
            concepts.push(concept);
          }
        });
        return concepts;
      }).flatMap(x => x);
    }

    // else explanation of query respose is same for all concepts in map
    const exp = x.explanation();
    const key = x.map().keys().next().value;

    return Array.from(x.map().values()).flatMap((concept) => {
      concept.explanation = exp;
      concept.graqlVar = key;
      return concept;
    });
  }).flatMap(x => x);
}

function buildValue(array) {
  if (!array) return '';
  return array.join(', ');
}

async function labelFromStorage(node, attributeTypes) {
  const map = {};
  // Populate map with map[attributeType] = array of values (can be undefined)
  // This is because we need to handle 2 cases:
  // - when the current node does not have any attribute of type `attributeType`
  // - when the current node has multiple attributes of type 'attributeType'
  const promises = (await (await node.attributes()).collect()).map(async (attr) => {
    const label = await (await attr.type()).label();
    const value = await attr.value();
    if (!map[label]) map[label] = [value];
    else map[label].push(value);
  });
  await Promise.all(promises);
  const label = attributeTypes.map(type => `${type}: ${buildValue(map[type])}`).join('\n');
  // Always show node type when displaying node attributes on label
  return `${node.type}\n${label}`;
}

async function buildLabel(node) {
  const labels = NodeSettings.getTypeLabels(node.type);
  if (labels.length) return labelFromStorage(node, labels); // this function is async
  let label;
  switch (node.baseType) {
    case 'ENTITY':
      label = `${node.type}: ${node.id}`;
      break;
    case 'ATTRIBUTE':
      label = `${node.type}: ${await node.value}`;
      break;
    case 'RELATION':
      label = '';
      break;
    default:
      label = node.type;
  }
  return label;
}

async function prepareSchemaConcept(schemaConcept) {
  schemaConcept.label = await schemaConcept.label();
  // schemaConcept.attributes = await computeAttributes(schemaConcept);
}

async function prepareEntity(entity) {
  entity.type = await (await entity.type()).label();
  entity.label = await buildLabel(entity);
  entity.isInferred = await entity.isInferred();
}

async function prepareRelation(rel) {
  rel.type = await (await rel.type()).label();
  rel.isInferred = await rel.isInferred();
}

async function prepareAttribute(attribute) {
  attribute.type = await (await attribute.type()).label();
  attribute.value = await attribute.value();
  attribute.label = await buildLabel(attribute);
  attribute.isInferred = await attribute.isInferred();
}

/**
 * For each node contained in concepts param, based on baseType, fetch type, value
 * and build label
 * @param {Object[]} concepts array of gRPC concepts to prepare
 */
async function prepareNodes(concepts) {
  const nodes = [];

  await Promise.all(concepts.map(async (concept) => {
    switch (concept.baseType) {
      case 'ENTITY_TYPE':
      case 'ATTRIBUTE_TYPE':
      case 'RELATION_TYPE':
        await prepareSchemaConcept(concept);
        break;
      case 'ENTITY':
        await prepareEntity(concept);
        break;
      case 'ATTRIBUTE':
        await prepareAttribute(concept);
        break;
      case 'RELATION': {
        await prepareRelation(concept);
        break;
      }
      default:
        break;
    }
    concept.offset = 0;
    concept.attrOffset = 0;
    nodes.push(concept);
  }));

  return nodes;
}

async function loadRolePlayers(relation, limitRolePlayers, limit, offset) {
  const nodes = [];
  const edges = [];
  let roleplayers = await relation.rolePlayersMap();
  roleplayers = Array.from(roleplayers.entries());
  if (limitRolePlayers) {
    roleplayers = roleplayers.slice(offset, limit + offset);
  }

  // Build array of promises
  const promises = Array.from(roleplayers, async ([role, setOfThings]) => {
    const roleLabel = await role.label();
    await Promise.all(Array.from(setOfThings.values()).map(async (thing) => {
      switch (thing.baseType) {
        case 'ENTITY':
          await prepareEntity(thing);
          break;
        case 'ATTRIBUTE':
          await prepareAttribute(thing);
          break;
        case 'RELATION':
          await prepareRelation(thing);
          break;
        default:
          throw new Error(`Unrecognised baseType of thing: ${thing.baseType}`);
      }
      thing.offset = 0;
      thing.attrOffset = 0;

      nodes.push(thing);
      edges.push({ from: relation.id, to: thing.id, label: roleLabel });
    }));
  });
  return Promise.all(promises).then((() => ({ nodes, edges })));
}

async function relationsRolePlayers(relations, limitRolePlayers, limit) {
  const results = await Promise.all(relations.map(rel => loadRolePlayers(rel, limitRolePlayers, limit, rel.offset)));
  return {
    nodes: results.flatMap(x => x.nodes),
    edges: results.flatMap(x => x.edges),
  };
}

async function buildFromConceptList(path, pathNodes) {
  const data = { nodes: await prepareNodes(pathNodes), edges: [] };

  const relations = data.nodes.filter(x => x.baseType === 'RELATION');

  const roleplayers = await relationsRolePlayers(relations);

  roleplayers.edges = roleplayers.edges.filter(x => (path.list().includes(x.from) && path.list().includes(x.to)));

  data.edges.push(...roleplayers.edges);

  data.edges.map(edge => Object.assign(edge, Style.computeShortestPathEdgeStyle()));
  return data;
}


export default {
  buildFromConceptList,
  prepareNodes,
  relationsRolePlayers,
  attachExplanation,
};
