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
    <div class="bottom-bar-wrapper">
        <div class="bottom-bar-nav">
            <div class="bottom-bar-arrow" @click="toggleBottomBar"><vue-icon :icon="(showBottomBarContent) ? 'chevron-down' : 'chevron-up'"></vue-icon></div>

        </div>

        <div v-if="showBottomBarContent" class="content">
            <textarea class="typeql-editor" id="typeQLEditor" ref="consoleEditor" rows="3" placeholder=">>"></textarea>
            <ul id="output">

            </ul>
        </div>
    </div>
</template>

<style scoped>

.bottom-bar-wrapper {
  background-color: var(--gray-1);
  border-top: var(--container-darkest-border);
  width: 100%;
  position: relative;
}

.bottom-bar-nav{
  border-bottom: var(--container-darkest-border);
  width: 100%;
  height: 20px;
  flex-direction: row;
}

.bottom-bar-arrow {
  height: 100%;
  position: relative;
  cursor: pointer;
  float: right;
  justify-content: center;
  display: flex;
  align-items: center;
}

.content {
    height: 150px;
    display: flex;
    flex-direction: column-reverse;
    background-color: #100F0F;
}

#output {
    display: flex;
    flex-direction: column;
    overflow: auto;
    height: 100%;
}

</style>

<script>
import TypeQLCodeMirror from './TopBar/TypeQLEditor/TypeQLCodeMirror';
import ConsoleUtils from './BottomBar/ConsoleUtils';

export default {
  data() {
    return {
      showBottomBarContent: false,
      codeMirror: {},
      currentQuery: '',
      scrolled: false,
    };
  },
  watch: {
    showBottomBarContent(val) {
      this.$nextTick(() => {
        if (val) {
          this.codeMirror = TypeQLCodeMirror.getCodeMirror(this.$refs.consoleEditor);
          this.codeMirror.setOption('extraKeys', {
            Enter: this.runConsoleQuery,
            'Shift-Enter': 'newlineAndIndent',
          });
        }
      });
    },
  },
  methods: {
    toggleBottomBar() {
      this.showBottomBarContent = !this.showBottomBarContent;
    },
    async runConsoleQuery() {
      const result = await this.$store.dispatch('exectueQuery', { query: this.codeMirror.getValue() });

      result.forEach(async (x) => {
        const output = await ConsoleUtils.conceptToString(x);
        const item = document.createElement('LI');
        const textnode = document.createTextNode(output);
        item.appendChild(textnode);
        document.getElementById('output').appendChild(item);
        this.updateScroll();
      });
    },
    updateScroll() {
      if (!this.scrolled) {
        const element = document.getElementById('output');
        element.scrollTop = element.scrollHeight;
      }
    },
  },
};
</script>
