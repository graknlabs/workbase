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
    <button class="btn define-btn" :class="(showPanel === 'relation') ? 'green-border': ''" @click="togglePanel">Relation Type</button>
    <div class="new-relation-panel-container" v-if="showPanel === 'relation'">
      <div class="title">
        Define New Relation Type
        <div class="close-container" @click="$emit('show-panel', undefined)"><vue-icon icon="cross" iconSize="12" className="tab-icon"></vue-icon></div>
      </div>
      <div class="content">

        <div class="row">
          <input class="input-small label-input" v-model="relationLabel" placeholder="Relation Label">
          sub
          <div v-bind:class="(showTypeList) ? 'btn type-btn type-list-shown' : 'btn type-btn'" @click="showTypeList = !showTypeList"><div class="type-btn-text" >{{superType}}</div><div class="type-btn-caret"><vue-icon className="vue-icon" icon="caret-down"></vue-icon></div></div>

          <div class="type-list" v-show="showTypeList">
              <ul v-for="type in superTypes" :key=type>
                  <li class="type-item" @click="selectSuperType(type)" v-bind:class="[(type === superType) ? 'type-item-selected' : '']">{{type}}</li>
              </ul>
          </div>
        </div>

        <div class="row" v-if="superRelatipnshipTypeRoles.length">
          <div class="relates-list">
            <ul class="relates" :class="(index > 0) ? 'margin-top' : ''" v-for="(role, index) in superRelatipnshipTypeRoles" :key=index>
              <div class="relates-label">relates</div>
              <div class="overriden" v-if="overridenRoles[index].override">
                <input class="input-small label-input role-override-label-input" v-model="overridenRoles[index].label" placeholder="Role Label">
                <div class="as-label">as</div>
              </div>
              <div class="role-readonly">{{role}}</div>
              <div class="btns">
                <div class="btn small-btn" v-if="!overridenRoles[index].override" @click="overRideRole(index)"><vue-icon icon="annotation" class="vue-icon" iconSize="12"></vue-icon></div>
                <div class="btn small-btn" v-if="overridenRoles[index].override && superRelatipnshipTypeRoles[index] !== superRelatipnshipTypeRoles[index - 1]" @click="overRideAgain(index, role)"><vue-icon icon="plus" class="vue-icon" iconSize="12"></vue-icon></div>
                <div class="btn small-btn" v-if="superRelatipnshipTypeRoles[index] === superRelatipnshipTypeRoles[index - 1]" @click="removeOverRidenRole(index)"><vue-icon icon="minus" class="vue-icon" iconSize="12"></vue-icon></div>
                <div class="btn small-btn" v-if="overridenRoles[index].override && superRelatipnshipTypeRoles[index] !== superRelatipnshipTypeRoles[index - 1]" @click="unOverRideRole(index)"><vue-icon icon="undo" class="vue-icon" iconSize="12"></vue-icon></div>
              </div>
            </ul>
          </div>
        </div>

        <div class="row">
          <div class="relates-list" v-if="newRoles.length">
            <ul class="relates" :class="(index > 0) ? 'margin-top' : ''" v-for="(role, index) in newRoles" :key=index>
              <div class="relates-label">relates</div>
              <input class="input-small label-input role-label-input" v-model="newRoles[index]" placeholder="Role Label">
              <div class="btn small-btn" @click="addNewRole"><vue-icon icon="plus" class="vue-icon" iconSize="12"></vue-icon></div>
              <div class="btn small-btn" @click="removeRole(index)"><vue-icon icon="minus" class="vue-icon" iconSize="12"></vue-icon></div>
            </ul>
          </div>
          <div v-else>
            <div class="relates">
              <div class="relates-more-label">relates more roles...</div>
              <div class="btn small-btn" @click="addNewRole"><vue-icon icon="plus" class="vue-icon" iconSize="12"></vue-icon></div>
            </div>
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
          <loading-button v-on:clicked="defineRelationType" text="Submit" :loading="showSpinner" className="btn submit-btn"></loading-button>
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

  .inherited-attribute-type-list {
    border: var(--container-darkest-border);
    border-bottom: none;
    background-color: var(--gray-1);
    width: 100%;
    max-height: 140px;
    overflow: auto;
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

  .row-2 {
    display: flex;
    flex-direction: row;
    padding: 0px var(--container-padding) 0px var(--container-padding);
    justify-content: space-between;
  }

  .green-border {
    border: 1px solid var(--button-hover-border-color);
  }

  .has {
    width: 100%;
  }

  .close-container {
      position: absolute;
      right: 2px;
  }

  .role-readonly {
    width: 100%;
    height: 22px;
    padding-left: 4px;
    background-color: var(--gray-2);
    border: var(--container-darkest-border);
    display: block;
    white-space: normal !important;
    word-wrap: break-word;
    line-height: 19px;
    overflow: -webkit-paged-x;
  }

  .role-readonly::-webkit-scrollbar {
    height: 2px;
  }

  .role-readonly::-webkit-scrollbar-thumb {
    background: var(--green-4);
  }

  .margin-top {
    margin-top:5px;
  }

  .overriden {
    display: flex;
    align-items: center;
  }

  .btns {
    display: flex;
    justify-content: flex-end;
    /* width: 100%; */
  }

  .as-label{
    text-align: center;
    width: 28px;
    white-space: nowrap;
  }

  .relates-list{
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .small-btn {
    margin-left: 5px;
  }

  .role-override-label-input {
    width: 101px !important;
    margin-right: 0px !important;
  }

  .role-label-input{
    width: 100% !important;
    margin-right: 0px !important;
  }

  .relates-label {
    margin-right: 5px;
  }

  .relates-more-label {
    margin-right: 183.5px;
  }

  .relates {
    display: flex;
    align-items: center;
    width: 100%;
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

  .plays {
    width: 140px;
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

  .new-relation-panel-container {
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

  .type-btn-text::-webkit-scrollbar {
    height: 2px;
  }

  .type-btn-text::-webkit-scrollbar-thumb {
    background: var(--green-4);
  }

  .type-btn-caret {
    cursor: pointer;
    align-items: center;
    display: flex;
  }

</style>

<script>
  import logger from '@/logger';
  import { DEFINE_RELATION_TYPE, OPEN_TYPEDB_TX } from '@/components/shared/StoresActions';
  import { createNamespacedHelpers } from 'vuex';

  export default {
    props: ['showPanel'],
    data() {
      return {
        showTypeList: false,
        superTypes: [],
        superType: undefined,
        relationLabel: '',
        showSpinner: false,
        newRoles: [''],
        superRelatipnshipTypeRoles: [],
        overridenRoles: [],
        toggledAttributeTypes: [],
        toggledRoleTypes: [],
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
        ...mapActions([DEFINE_RELATION_TYPE, OPEN_TYPEDB_TX]),
      };
    },
    watch: {
      showPanel(val) {
        if (val === 'relation') { // reset panel when it is toggled
          this.resetPanel();
        }
      },
      metaTypeInstances(val) {
        this.hasAttributes = val.attributes;
        this.superTypes = ['relation', ...this.metaTypeInstances.relations];
      },
      async superType(val) {
        if (val !== 'relation') { // if super type is not 'relation' then compute roles of supertype for inheriting and overriding
          this.newRoles = [];

          const tx = await this[OPEN_TYPEDB_TX]();
          const superType = await tx.concepts().getRelationType(val);

          this.superRelatipnshipTypeRoles = await superType.asRemote(tx).getRelates().map(role => role.getLabel().name()).collect();
          this.overridenRoles.push(...this.superRelatipnshipTypeRoles.map(role => ({ label: role, override: false })));

          this.supAttributes = await superType.asRemote(tx).getOwns().map(x => x.getLabel().name()).collect();
          this.hasAttributes = this.hasAttributes.filter(x => !this.supAttributes.includes(x));
          tx.close();
        } else {
          this.resetPanel();

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
      async defineRelationType() {
        if (this.relationLabel === '') {
          this.$notifyError('Cannot define Relation Type without Relation Label');
        } else if (this.superType === 'relation' && !this.newRoles.length && !this.toggledRoleTypes.length) {
          this.$notifyError('Cannot define Relation Type without at least one related role');
        } else {
          let overrideError = false;

          this.overridenRoles.forEach((role) => {
            if (role.label === '') overrideError = true;
          });

          if (overrideError) {
            this.$notifyError('Cannot define Relation Type with an empty overridden role');
          } else {
            this.showSpinner = true;

            // collect all roles to be defined and related
            const defineRoles = this.newRoles.map(role => ({ label: role, overridden: null }))
              .concat(this.overridenRoles.filter(role => role.override).map(role => ({ label: role.label, overridden: role.superType })));

            this[DEFINE_RELATION_TYPE]({
              relationLabel: this.relationLabel,
              superType: this.superType,
              defineRoles,
              attributeTypes: this.toggledAttributeTypes,
              roleTypes: this.toggledRoleTypes,
            })
              .then(() => {
                this.showSpinner = false;
                this.$notifyInfo(`Relation Type, ${this.relationLabel}, has been defined`);
                this.resetPanel();
              })
              .catch((e) => {
                logger.error(e.stack);
                this.showSpinner = false;
                this.$notifyError(e.message);
              });
          }
        }
      },
      selectSuperType(type) {
        this.superType = type;
        this.showTypeList = false;
      },
      resetPanel() {
        this.relationLabel = '';
        this.superTypes = ['relation', ...this.metaTypeInstances.relations];
        this.superType = this.superTypes[0];
        this.newRoles = [''];
        this.toggledAttributeTypes = [];
        this.toggledRoleTypes = [];
        this.showHasPanel = false;
        this.showPlaysPanel = false;
        this.superRelatipnshipTypeRoles = [];
        this.overridenRoles = [];
      },
      togglePanel() {
        if (this.showPanel === 'relation') this.$emit('show-panel', undefined);
        else this.$emit('show-panel', 'relation');
      },
      addNewRole() {
        this.newRoles.push('');
      },
      removeRole(index) {
        this.newRoles.splice(index, 1);
      },
      overRideRole(index) {
        this.overridenRoles[index].superType = this.overridenRoles[index].label;
        this.overridenRoles[index].label = '';
        this.overridenRoles[index].override = true;
        const temp = this.superRelatipnshipTypeRoles;
        this.superRelatipnshipTypeRoles = null;
        this.superRelatipnshipTypeRoles = temp;
      },
      unOverRideRole(index) {
        this.overridenRoles[index].superType = undefined;
        this.overridenRoles[index].label = this.superRelatipnshipTypeRoles[index];
        this.overridenRoles[index].override = false;
        const temp = this.superRelatipnshipTypeRoles;
        this.superRelatipnshipTypeRoles = null;
        this.superRelatipnshipTypeRoles = temp;
      },
      overRideAgain(index, role) {
        this.superRelatipnshipTypeRoles.splice(index + 1, 0, role);
        this.overridenRoles.splice(index + 1, 0, { label: '', superType: role, override: false });
        this.overridenRoles[index + 1].override = true;
      },
      removeOverRidenRole(index) {
        this.superRelatipnshipTypeRoles.splice(index, 1);
        this.overridenRoles.splice(index, 1);
      },
    },
  };
</script>

