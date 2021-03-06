<!--
 Copyright (C) 2021 Vaticle

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
-->

<template>
  <div>
    <button class="btn define-btn" :class="(showPanel === 'entity') ? 'green-border': ''" @click="togglePanel">Entity Type</button>
    <div class="new-entity-panel-container" v-if="showPanel === 'entity'">
      <div class="title">
        Define New Entity Type
        <div class="close-container" @click="$emit('show-panel', undefined)"><vue-icon icon="cross" iconSize="12" className="tab-icon"></vue-icon></div>
      </div>

      <div class="content">
        <div class="row">
          <input class="input-small label-input" v-model="entityLabel" placeholder="Entity Label">
          sub
          <div class="btn type-btn" :class="(showEntityTypeList) ? 'type-list-shown' : ''" @click="showEntityTypeList = !showEntityTypeList"><div class="type-btn-text">{{superType}}</div><div class="type-btn-caret"><vue-icon className="vue-icon" icon="caret-down"></vue-icon></div></div>

          <div class="type-list" v-show="showEntityTypeList">
              <ul v-for="type in superTypes" :key=type>
                  <li class="type-item" @click="selectSuperType(type)" :class="[(type === superType) ? 'type-item-selected' : '']">{{type}}</li>
              </ul>
          </div>
        </div>

        <div class="row">
          <div @click="showHasPanel = !showHasPanel" class="has-header">
            <vue-icon :icon="(showHasPanel) ?  'chevron-down' : 'chevron-right'" iconSize="14" className="vue-icon"></vue-icon>
            owns
            </div>
        </div>


        <div class="row-2" v-if="showHasPanel">
          <div class="has">
            <ul class="inherited-attribute-type-list" v-if="supAttributes.length">
              <li class="inherited-attribute" v-for="attributeType in supAttributes" :key=attributeType>
                  <div else>{{attributeType}}</div>
              </li>
            </ul>
            <ul class="attribute-type-list" v-if="hasAttributes.length">
              <li :class="(toggledAttributeTypes.includes(attributeType)) ? 'attribute-btn toggle-attribute-btn' : 'attribute-btn'" @click="toggleAttributeType(attributeType)" v-for="attributeType in hasAttributes" :key=attributeType>
                  <div else>{{attributeType}}</div>
              </li>
            </ul>
            <div v-else class="no-types">There are no attribute types defined</div>
          </div>
        </div>

    
        <div class="row">
          <div @click="showPlaysPanel = !showPlaysPanel" class="has-header">
            <vue-icon :icon="(showPlaysPanel) ?  'chevron-down' : 'chevron-right'" iconSize="14" className="vue-icon"></vue-icon>
            plays
            </div>
        </div>

        <div class="row-2" v-if="showPlaysPanel">
          <div class="has">
            <ul class="attribute-type-list" v-if="metaTypeInstances.roles.length">
              <li :class="(toggledRoleTypes.includes(roleType)) ? 'attribute-btn toggle-attribute-btn' : 'attribute-btn'" @click="toggleRoleType(roleType)" v-for="roleType in metaTypeInstances.roles" :key=roleType>
                  {{roleType}}
              </li>
            </ul>
            <div v-else class="no-types">There are no role types defined</div>
          </div>
        </div>

        <div class="submit-row">
          <button class="btn submit-btn" @click="resetPanel">Clear</button>
          <loading-button v-on:clicked="defineEntityType" text="Submit" :loading="showSpinner" className="btn submit-btn"></loading-button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>

  .inherited-attribute {
    align-items: center;
    padding: 2px;
    white-space: normal;
    word-wrap: break-word;
    background-color: var(--purple-3);
  }

  .no-types {
    background-color: var(--gray-1);
    padding: var(--container-padding);
    border: var(--container-darkest-border);
    border-top: 0px;
  }


  .has-header {
    width: 100%;
    background-color: var(--gray-1);
    border: var(--container-darkest-border);
    height: 22px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .has {
    width: 100%;
  }

  .green-border {
    border: 1px solid var(--button-hover-border-color);
  }

  .close-container {
    position: absolute;
    right: 2px;
  }

  .submit-row {
    justify-content: space-between;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: var(--container-padding);
  }

  .attribute-type-list {
    border: var(--container-darkest-border);
    background-color: var(--gray-1);
    width: 100%;
    max-height: 140px;
    overflow: auto;
  }

  .attribute-type-list::-webkit-scrollbar {
    width: 2px;
  }

  .attribute-type-list::-webkit-scrollbar-thumb {
    background: var(--green-4);
  }

  .inherited-attribute-type-list {
    border: var(--container-darkest-border);
    border-bottom: none;
    background-color: var(--gray-1);
    width: 100%;
    max-height: 140px;
    overflow: auto;
  }

  /*dynamic*/
  .attribute-btn {
    align-items: center;
    padding: 2px;
    cursor: pointer;
    white-space: normal;
    word-wrap: break-word;
  }

  /*dynamic*/
  .attribute-btn:hover {
    background-color: var(--purple-4);
  }

  /*dynamic*/
  .toggle-attribute-btn {
    background-color: var(--purple-3);
  }


  .label-input {
    width: 140px;
    margin-right: 5px;
  }

  .row {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: var(--container-padding) var(--container-padding) 0px var(--container-padding);
    justify-content: space-between;
  }

  .row-2 {
    display: flex;
    flex-direction: row;
    padding: 0px var(--container-padding) 0px var(--container-padding);
    justify-content: space-between;
  }



  .new-entity-panel-container {
    position: absolute;
    left: 120px;
    top: 10px;
    background-color: var(--gray-2);
    border: var(--container-darkest-border);
  }

  .title {
    background-color: var(--gray-1); 
    display: flex;
    align-items: center;
    padding: var(--container-padding);
    border-bottom: var(--container-darkest-border);
  }

  .content {
    padding: var(--container-padding);
  }

  .type-list {
    border-left: var(--container-darkest-border);
    border-right: var(--container-darkest-border);
    border-bottom: var(--container-darkest-border);
    background-color: var(--gray-1);
    max-height: 172px;
    overflow: auto;
    position: absolute;
    right: 10px;
    top: 54px;
    width: 140px;
    z-index: 1;
  }

  .type-list::-webkit-scrollbar {
    width: 2px;
  }

  .type-list::-webkit-scrollbar-thumb {
    background: var(--green-4);
  }
  
  .type-list-shown {
    border: 1px solid var(--button-hover-border-color) !important;
  }

  .type-item {
    align-items: center;
    padding: 2px;
    cursor: pointer;
    white-space: normal;
    word-wrap: break-word;
  }

  .type-item:hover {
    background-color: var(--purple-4);
  }

  /*dynamic*/
  .type-item-selected {
    background-color: var(--purple-3);
  }

  .type-btn {
    height: 22px;
    min-height: 22px !important;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    width: 140px;
    z-index: 2;
    margin: 0px 0px 0px 5px !important;
  }

  .type-btn-text {
    width: 100%;
    padding-left: 4px;
    display: block;
    white-space: normal !important;
    word-wrap: break-word;
    line-height: 19px;
    overflow: -webkit-paged-x;
  }

  .type-btn-caret {
    cursor: pointer;
    align-items: center;
    display: flex;
  }

  .type-btn-text::-webkit-scrollbar {
    height: 2px;
  }

  .type-btn-text::-webkit-scrollbar-thumb {
    background: var(--green-4);
  }

</style>

<script>
  import logger from '@/logger';
  import { DEFINE_ENTITY_TYPE, OPEN_TYPEDB_TX } from '@/components/shared/StoresActions';
  import { createNamespacedHelpers } from 'vuex';

  export default {
    props: ['showPanel'],
    data() {
      return {
        showEntityTypeList: false,
        superTypes: [],
        toggledAttributeTypes: [],
        toggledRoleTypes: [],
        superType: undefined,
        entityLabel: '',
        showSpinner: false,
        showHasPanel: false,
        showPlaysPanel: false,
        hasAttributes: [],
        supAttributes: [],
      };
    },
    beforeCreate() {
      const { mapGetters, mapActions } = createNamespacedHelpers('schema-design');

      // computed
      this.$options.computed = {
        ...(this.$options.computed || {}),
        ...mapGetters(['metaTypeInstances']),
      };

      // methods
      this.$options.methods = {
        ...(this.$options.methods || {}),
        ...mapActions([DEFINE_ENTITY_TYPE, OPEN_TYPEDB_TX]),
      };
    },
    watch: {
      showPanel(val) {
        if (val === 'entity') {
          this.resetPanel();
        }
      },
      metaTypeInstances(val) {
        this.hasAttributes = val.attributes;
        this.superTypes = ['entity', ...this.metaTypeInstances.entities];
      },
      async superType(val) {
        if (val !== 'entity') { // if sup-typing an entity do not show inherited attributes in has panel to avoid duplicated attributes
          const tx = await this[OPEN_TYPEDB_TX]();
          const superType = await tx.concepts().getEntityType(val);
          this.supAttributes = await superType.asRemote(tx).getOwns().map(x => x.getLabel().name()).collect();
          this.hasAttributes = this.hasAttributes.filter(x => !this.supAttributes.includes(x));
          tx.close();
        } else {
          this.hasAttributes = this.metaTypeInstances.attributes;
          this.supAttributes = [];
        }
      },
    },
    methods: {
      toggleAttributeType(type) {
        const index = this.toggledAttributeTypes.indexOf(type);
        if (index > -1) {
          this.toggledAttributeTypes.splice(index, 1);
        } else {
          this.toggledAttributeTypes.push(type);
        }
      },
      toggleRoleType(type) {
        const index = this.toggledRoleTypes.indexOf(type);
        if (index > -1) {
          this.toggledRoleTypes.splice(index, 1);
        } else {
          this.toggledRoleTypes.push(type);
        }
      },
      defineEntityType() {
        if (this.entityLabel === '') {
          this.$notifyError('Cannot define Entity Type without Entity Label');
        } else {
          this.showSpinner = true;
          this[DEFINE_ENTITY_TYPE]({ entityLabel: this.entityLabel, superType: this.superType, attributeTypes: this.toggledAttributeTypes, roleTypes: this.toggledRoleTypes })
            .then(() => {
              this.showSpinner = false;
              this.$notifyInfo(`Entity Type, ${this.entityLabel}, has been defined`);
              this.resetPanel();
            })
            .catch((e) => {
              logger.error(e.stack);
              this.showSpinner = false;
              this.$notifyError(e.message);
            });
        }
      },
      selectSuperType(type) {
        this.superType = type;
        this.showEntityTypeList = false;
      },
      resetPanel() {
        this.entityLabel = '';
        this.showEntityTypeList = false;
        this.superTypes = ['entity', ...this.metaTypeInstances.entities];
        this.superType = this.superTypes[0];
        this.toggledAttributeTypes = [];
        this.toggledRoleTypes = [];
        this.showHasPanel = false;
        this.showPlaysPanel = false;
      },
      togglePanel() {
        if (this.showPanel === 'entity') this.$emit('show-panel', undefined);
        else this.$emit('show-panel', 'entity');
      },
    },
  };
</script>
