<script setup lang="ts">
import { FiSettings, FiGithub } from 'vue-icons-plus/fi';
import { useSlots } from 'vue';
import SidebarCloseBtn from '@/components/SidebarCloseBtn.vue';
import { useSidebar } from '@/composables/useSidebar';
import NewEventBtn from '@/components/NewEventBtn.vue';
import { exportZip } from '@/utils';
import { LuFolderArchive, LuRefreshCcw } from 'vue-icons-plus/lu';
import { syncAllWrapper } from '@/services/gitSync';

const emit = defineEmits(['refresh-data']);

const slots = useSlots();
const sidebar = useSidebar();

async function syncAndReload() {
  await syncAllWrapper();
  emit('refresh-data');
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

    <div id="links">
      <router-link to="/settings">
        <FiSettings />
      </router-link>
      <button type="button" @click="exportZip('')">
        <LuFolderArchive style="transform: scale(1.1)" />
      </button>
      <button type="button" @click="syncAndReload">
        <LuRefreshCcw />
      </button>
      <a href="https://github.com/git-calendar/web-client" target="_blank">
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

  padding: 0.5rem;

  background-color: var(--sidebar-color);
}

#links {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  position: absolute;
  bottom: 0.8rem;

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
  margin: 0.5rem 0 0.8rem 0;
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
