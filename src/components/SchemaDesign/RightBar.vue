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
  <div class="right-bar-container">
    <div class="right-bar-container">
      <div class="minimize-right-bar" v-bind:style= "[showRightBar ? {} : {'opacity': '1'}]" @click="showRightBar = !showRightBar">
        <vue-icon :icon="(showRightBar) ? 'double-chevron-right' : 'double-chevron-left'" iconSize="14" className="vue-icon"></vue-icon>
      </div>

      <div class="nav" v-if="showRightBar">
        <div @click="toggleConceptInfoTab" :class="(showConceptInfoTab) ? 'nav-tab nav-tab-selected' : 'nav-tab'" class="concept-info-tab"><vue-icon icon="info-sign" className="right-bar-tab-icon"></vue-icon></div>
        <div @click="toggleSettingsTab" :class="(showSettingsTab) ? 'nav-tab nav-tab-selected' : 'nav-tab'" class="settings-tab"><vue-icon icon="cog" className="right-bar-tab-icon"></vue-icon></div>
        <div class="nav-bar-space"></div>
      </div>

      <div class="content" v-if="showRightBar">
        <keep-alive>
          <concept-info-tab v-if="showConceptInfoTab"></concept-info-tab>
          <settings-tab v-if="showSettingsTab"></settings-tab>
        </keep-alive>
      </div>
  </div>
  </div>
</template>

<style scoped lang="scss">
  $navHeight: 30px;

  .content {
    width: 201px;
    max-height: calc(100% - #{$navHeight});
    overflow-y: scroll;
  }

  .right-bar-container {
    background-color: var(--gray-3);
    border-left: var(--container-darkest-border);
    height: 100%;
    position: relative;
    right: 0px;
    top: 0px;
    z-index: 1;
  }

  .minimize-right-bar {
    background-color: var(--gray-1);
    border-right: var(--container-darkest-border);
    border-top: var(--container-darkest-border);
    border-bottom: var(--container-darkest-border);
    width: 18px;
    height: 30px;
    position: absolute;
    right: 100%;
    top: 50%;
    opacity: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index:1;
}


.right-bar-container:hover {
  .minimize-right-bar {
    opacity: 1;
  }
}

    .nav-bar-space {
        border-bottom: var(--container-darkest-border);
        display: flex;
        flex: 1;
    }

        .handle-ml {
        height: 100% !important;
        top: 0% !important;
        background: none !important;
        border: none !important;
    }

     .nav {
        background-color: var(--gray-2);
        height: $navHeight;
        display: flex;
        flex-direction: row;
    }

    .nav-tab {
        background-color: var(--gray-2);
        border-right: var(--container-darkest-border);
        width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-bottom: var(--container-darkest-border);
    }

    .nav-tab-selected {
        background-color: var(--gray-1);
        border-right: var(--container-darkest-border);
        border-bottom: 1px solid var(--gray-1);
        width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

    }

</style>

<script>
  import ConceptInfoTab from './RightBar/ConceptInfoTab';
  import SettingsTab from './RightBar/SettingsTab';

  export default {
    components: { ConceptInfoTab, SettingsTab },
    data() {
      return {
        showConceptInfoTab: true,
        showSettingsTab: false,
        showRightBar: true,
      };
    },
    methods: {
      toggleConceptInfoTab() {
        this.showConceptInfoTab = true;
        this.showSettingsTab = false;
      },
      toggleSettingsTab() {
        this.showSettingsTab = true;
        this.showConceptInfoTab = false;
      },
      toggleRightBar() {
        this.showRightBar = !this.showRightBar;
      },
    },
  };
</script>
