const methods = {
  concept: {
    static: {
      baseType: 'META_TYPE',
      id: 'META_TYPE',
      isType: () => false,
      isEntityType: () => false,
      isAttributeType: () => false,
      isRelationType: () => false,
      isRule: () => false,
      isRole: () => false,
      isThing: () => false,
      isEntity: () => false,
      isAttribute: () => false,
      isRelation: () => false,
      isSchemaConcept: () => false,
    },
    local: {
      label: () => 'thing',
    },
    remote: {
      label: () => Promise.resolve('thing'),
    },
  },
  rule: {
    static: {
      isRule: () => true,
    },
    local: {
      label: () => 'rule',
    },
    remote: {
      label: () => Promise.resolve('rule'),
    },
  },
  type: {
    static: {
      isType: () => true,
    },
    local: {
      label: () => 'type',
    },
    remote: {
      label: () => Promise.resolve('type'),
      isAbstract: () => Promise.resolve(false),
      attributes: () => Promise.resolve({ collect: () => Promise.resolve([]) }),
      playing: () => Promise.resolve({ collect: () => Promise.resolve([]) }),
    },
  },
  role: {
    static: {
      baseType: 'ROLE',
      id: 'role-id',
      isRole: () => true,
    },
    local: {
      label: () => 'role',
    },
    remote: {
      label: () => Promise.resolve('role'),
    },
  },
  entityType: {
    static: {
      baseType: 'ENTITY_TYPE',
      id: 'entity-type-id',
      isEntityType: () => true,
    },
    local: {
      label: () => 'entity-type',
    },
    remote: {
      label: () => Promise.resolve('entity-type'),
    },
  },
  attributeType: {
    static: {
      baseType: 'ATTRIBUTE_TYPE',
      id: 'attribute-type-id',
      isAttributeType: () => true,
    },
    local: {
      label: () => 'attribute-type',
    },
    remote: {
      label: () => Promise.resolve('attribute-type'),
      valueType: () => Promise.resolve('string'),
    },
  },
  relationType: {
    static: {
      baseType: 'RELATION_TYPE',
      id: 'relation-type-id',
      isRelationType: () => true,
    },
    local: {
      label: () => 'relation-type',
    },
    remote: {
      label: () => Promise.resolve('relation-type'),
      roles: () => Promise.resolve({ collect: () => Promise.resolve([]) }),
    },
  },
  thing: {
    static: {
      isThing: () => true,
    },
    local: {
      isInferred: () => false,
    },
    remote: {
      isInferred: () => Promise.resolve(false),
      attributes: () => Promise.resolve({ collect: () => Promise.resolve([]) }),
      relations: () => Promise.resolve({ collect: () => Promise.resolve([]) }),
      roles: () => Promise.resolve({ collect: () => Promise.resolve([]) }),
    },
  },
  entity: {
    static: {
      baseType: 'ENTITY',
      id: 'entity-id',
      isEntity: () => true,
    },
    local: {},
    remote: {},
  },
  attribute: {
    static: {
      baseType: 'ATTRIBUTE',
      id: 'attribute-id',
      isEntity: () => true,
    },
    local: {
      valueType: () => 'string',
      value: () => 'attribute-value',
    },
    remote: {
      valueType: () => Promise.resolve('string'),
      value: () => Promise.resolve('attribute-value'),
      owners: () => Promise.resolve({ collect: Promise.resolve([]) }),
    },
  },
  relation: {
    static: {
      baseType: 'RELATION',
      id: 'relation-id',
      isEntity: () => true,
    },
    local: {
      valueType: () => 'string',
      value: () => 'relation-value',
    },
    remote: {
      rolePlayersMap: () => Promise.resolve(new Map()),
    },
  },
};

/**
 * produces the props that will complete (or override) the defaults
 * @param {*} userOptions // options provided by the end user (the test)
 * @param {*} helperProps // options provided by the helper
 * @returns acummilation of the given props, with userProps being superior
 */
const getExtraProps = (userOptions, helperProps) => {
  const extraProps = { remote: {}, local: {} };

  if (helperProps && helperProps.remote) extraProps.remote = { ...extraProps.remote, ...helperProps.remote };
  if (userOptions && userOptions.extraProps && userOptions.extraProps.remote) extraProps.remote = { ...extraProps.remote, ...userOptions.extraProps.remote };

  if (helperProps && helperProps.local) extraProps.local = { ...extraProps, ...helperProps.local };
  if (userOptions && userOptions.extraProps && userOptions.extraProps.local) extraProps.local = { ...extraProps.local, ...userOptions.extraProps.local };

  return extraProps;
};

const getMockedConcept = (commons, extraProps, isRemote) => {
  let staticProps = {};
  commons.forEach((common) => { staticProps = { ...staticProps, ...methods[common].static }; });

  let remoteProps = {};
  commons.forEach((common) => { remoteProps = { ...remoteProps, ...methods[common].remote }; });
  if (extraProps.remote) remoteProps = { ...remoteProps, ...extraProps.remote };

  let localProps = {};
  commons.forEach((common) => { localProps = { ...localProps, ...methods[common].local }; });
  if (extraProps.remote) localProps = { ...localProps, ...extraProps.local };

  const remoteConcept = { ...staticProps, ...remoteProps };
  const localConcept = { ...staticProps, ...localProps, asRemote: () => remoteConcept };

  const mockedConcept = isRemote ? { ...remoteConcept } : { ...localConcept };

  return mockedConcept;
};

export const getMockedMetaType = (options) => {
  const extraProps = getExtraProps(options);

  return getMockedConcept(
    ['concept'],
    extraProps,
    options && options.isRemote,
  );
};

export const getMockedEntityType = (options) => {
  const extraProps = getExtraProps(options, {
    remote: { sup: () => Promise.resolve(getMockedMetaType({ isRemote: true })) },
  });

  return getMockedConcept(
    ['concept', 'type', 'entityType'],
    extraProps,
    options && options.isRemote,
  );
};

export const getMockedAttributeType = (options) => {
  const extraProps = getExtraProps(options, {
    remote: { sup: () => Promise.resolve(getMockedMetaType({ isRemote: true })) },
  });

  return getMockedConcept(
    ['concept', 'type', 'attributeType'],
    extraProps,
    options && options.isRemote,
  );
};

export const getMockedRelationType = (options) => {
  const extraProps = getExtraProps(options, {
    remote: { sup: () => Promise.resolve(getMockedMetaType({ isRemote: true })) },
  });

  return getMockedConcept(
    ['concept', 'type', 'relationType'],
    extraProps,
    options && options.isRemote,
  );
};

export const getMockedRule = (options) => {
  const extraProps = getExtraProps(options);

  return getMockedConcept(
    ['concept', 'rule'],
    extraProps,
    options && options.isRemote,
  );
};

export const getMockedRole = (options) => {
  const extraProps = getExtraProps(options);

  return getMockedConcept(
    ['concept', 'type', 'role'],
    extraProps,
    options && options.isRemote,
  );
};

export const getMockedEntity = (options) => {
  const extraProps = getExtraProps(options, {
    local: { type: () => getMockedEntityType() },
  });

  return getMockedConcept(
    ['concept', 'thing', 'entity'],
    extraProps,
    options && options.isRemote,
  );
};


export const getMockedAttribute = (options) => {
  const extraProps = getExtraProps(options, {
    local: { type: () => getMockedAttributeType() },
    remote: { type: () => Promise.resolve(getMockedAttributeType().asRemote()) },
  });

  return getMockedConcept(
    ['concept', 'thing', 'attribute'],
    extraProps,
    options && options.isRemote,
  );
};

export const getMockedRelation = (options) => {
  const extraProps = getExtraProps(options, {
    local: { type: () => getMockedRelationType() },
  });

  return getMockedConcept(
    ['concept', 'thing', 'relation'],
    extraProps,
    options && options.isRemote,
  );
};

export const getMockedConceptMap = (concepts, vars = [], explanationAnswers) => {
  const map = new Map();
  if (vars.length) {
    concepts.forEach((concept, index) => { map.set(vars[index], concept); });
  } else {
    concepts.forEach((concept, index) => { map.set(index, concept); });
  }
  const mock = {
    map: () => map,
    hasExplanation: () => !!explanationAnswers,
    explanation: () => ({ getAnswers: () => explanationAnswers || [] }),
  };
  return mock;
};

export const getMockedTransaction = (answers, customFuncs) => {
  let mocked = {
    query: () => ({
      collect: () => Promise.resolve(answers),
      collectConcepts: () => Promise.resolve(answers.map((answer, index) => answer.map().get(index))),
    }),
    commit: () => Promise.resolve(),
    close: () => Promise.resolve(),
    isOpen: () => Promise.resolve(true),
  };
  if (customFuncs) mocked = { ...mocked, ...customFuncs };
  return mocked;
};

export const getMockedTransactionLazy = (answers, customFuncs) => {
  const queryIterator = (end) => {
    if (!end) return null;
    let next = 0;
    const iterator = {
      async next() {
        if (next < end) {
          next += 1;
          return Promise.resolve(answers[next - 1]);
        }
        return Promise.resolve(null);
      },
    };
    return iterator;
  };

  const iterator = queryIterator(answers.length);

  let mocked = {
    query: () => Promise.resolve(iterator),
  };

  if (customFuncs) mocked = { ...mocked, ...customFuncs };
  return mocked;
};
