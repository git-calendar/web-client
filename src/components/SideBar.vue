<script setup lang="ts">
import { FiSettings, FiGithub, FiHelpCircle } from 'vue-icons-plus/fi';
import { useSlots } from 'vue';
import SidebarCloseBtn from '@/components/SidebarCloseBtn.vue';
import { useSidebar } from '@/composables/useSidebar';
import NewEventBtn from '@/components/NewEventBtn.vue';
import { LuRefreshCcw } from 'vue-icons-plus/lu';
import { syncAllWrapper } from '@/services/gitSync';
import { notifyEventsChanged } from '@/composables/useEventsRefresh';

const slots = useSlots();
const sidebar = useSidebar();

async function syncAndReload() {
  await syncAllWrapper();
  notifyEventsChanged();
}
</script>

<template>
  <aside>
    <div id="top-btns">
      <SidebarCloseBtn v-if="sidebar.isOpen.value" />
      <NewEventBtn :large="true" />
    </div>

    <hr />

    <template v-if="slots.default">
      <template v-for="(vnode, index) in slots.default()" :key="index">
        <component :is="vnode" />
        <hr v-if="index < slots.default().length - 1" />
      </template>
    </template>

    <hr style="margin-top: auto" />
    <div id="links">
      <router-link to="/settings" :title="$t('actions.settings')" :aria-label="$t('actions.settings')">
        <FiSettings />
      </router-link>
      <router-link to="/guide" title="Guide" aria-label="Guide">
        <FiHelpCircle />
      </router-link>
      <button
        type="button"
        :title="$t('actions.syncCalendars')"
        :aria-label="$t('actions.syncCalendars')"
        @click="syncAndReload"
      >
        <LuRefreshCcw />
      </button>
      <a
        href="https://github.com/git-calendar"
        target="_blank"
        rel="noopener noreferrer"
        :title="$t('actions.sourceCode')"
        :aria-label="$t('actions.sourceCode')"
      >
        <FiGithub style="position: relative; left: -2%; top: 2%" />
      </a>
    </div>
  </aside>
</template>

<style scoped>
aside {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  overflow: hidden;
  min-height: 0;

  padding: 0.5rem;

  background-color: var(--sidebar-color);

  button {
    background-color: var(--sidebar-btn-bg-color);

    &:hover:not(:focus):not(:disabled) {
      background-color: var(--sidebar-btn-bg-hover-color);
    }
  }
}

#links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem;

  > * {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.3rem;
    width: 2.1rem;
    aspect-ratio: 1/1;
    background-color: transparent;

    border-radius: var(--small-border-radius);

    &:hover {
      background-color: var(--sidebar-hover-color);
    }
  }
}

hr {
  width: 98%;
  border: 0.5px solid white;
  opacity: 0.2;
  margin: 0.5rem 0;
}

#top-btns {
  display: flex;
  width: 100%;
  gap: 0.5rem;

  > .new-event-btn {
    flex-grow: 1;
  }
}
</style>
