import { dataType } from 'grakn-client';

let tx;

function SchemaHandler(graknTx) {
  tx = graknTx;
}

function toGraknDatatype(dataTypeParam) {
  switch (dataTypeParam) {
    case 'string': return dataType.STRING;
    case 'date': return dataType.DATETIME;
    case 'boolean': return dataType.BOOLEAN;
    case 'long': return dataType.LONG;
    case 'double': return dataType.DOUBLE;
    default: throw new Error(`Datatype not recognised. Received [${dataTypeParam}]`);
  }
}

SchemaHandler.prototype.defineEntityType = async function define({ entityLabel, superType }) {
  const type = await tx.putEntityType(entityLabel);
  const directSuper = await tx.getSchemaConcept(superType);
  await type.sup(directSuper);
};

SchemaHandler.prototype.defineRole = async function define({ roleLabel, superType }) {
  const type = await tx.putRole(roleLabel);
  const directSuper = await tx.getSchemaConcept(superType);
  await type.sup(directSuper);
  return type;
};

SchemaHandler.prototype.defineRelationType = async function define({ relationLabel, superType }) {
  const type = await tx.putRelationType(relationLabel);
  const directSuper = await tx.getSchemaConcept(superType);
  await type.sup(directSuper);
  return type;
};

SchemaHandler.prototype.defineAttributeType = async function define({ attributeLabel, superType, dataType }) {
  const type = await tx.putAttributeType(attributeLabel, toGraknDatatype(dataType));
  const directSuper = await tx.getSchemaConcept(superType);
  await type.sup(directSuper);
};

SchemaHandler.prototype.defineRule = async function define({ ruleLabel, when, then }) {
  return tx.putRule(ruleLabel, when, then);
};

SchemaHandler.prototype.deleteType = async function deleteType({ label }) {
  const type = await tx.getSchemaConcept(label);
  await type.delete();
  return type.id;
};

SchemaHandler.prototype.addAttribute = async function addAttribute({ schemaLabel, attributeLabel }) {
  const type = await tx.getSchemaConcept(schemaLabel);
  const attribute = await tx.getSchemaConcept(attributeLabel);
  return type.has(attribute);
};

SchemaHandler.prototype.deleteAttribute = async function deleteAttribute({ label, attributeLabel }) {
  const type = await tx.getSchemaConcept(label);
  const attribute = await tx.getSchemaConcept(attributeLabel);
  return type.unhas(attribute);
};

SchemaHandler.prototype.addPlaysRole = async function addPlaysRole({ schemaLabel, roleLabel }) {
  const type = await tx.getSchemaConcept(schemaLabel);
  const role = await tx.getSchemaConcept(roleLabel);
  return type.plays(role);
};

SchemaHandler.prototype.deletePlaysRole = async function deletePlaysRole({ label, roleLabel }) {
  const type = await tx.getSchemaConcept(label);
  const role = await tx.getSchemaConcept(roleLabel);
  return type.unplay(role);
};

SchemaHandler.prototype.addRelatesRole = async function addRelatesRole({ schemaLabel, roleLabel }) {
  const relationType = await tx.getSchemaConcept(schemaLabel);
  const role = await tx.getSchemaConcept(roleLabel);
  return relationType.relates(role);
};

SchemaHandler.prototype.deleteRelatesRole = async function deleteRelatesRole({ label, roleLabel }) {
  const relationType = await tx.getSchemaConcept(label);
  const role = await tx.getSchemaConcept(roleLabel);
  await relationType.unrelate(role);
  return role.delete();
};

export default SchemaHandler;
