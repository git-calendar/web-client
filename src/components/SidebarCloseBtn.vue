<script setup lang="ts">
import { useSidebar } from '@/composables/useSidebar';
import { TbLayoutSidebar, TbLayoutSidebarFilled } from 'vue-icons-plus/tb';

const sidebar = useSidebar();
</script>

<template>
  <button
    id="sidebar-toggle"
    :title="$t(sidebar.isOpen.value ? 'actions.closeSidebar' : 'actions.openSidebar')"
    :aria-label="$t(sidebar.isOpen.value ? 'actions.closeSidebar' : 'actions.openSidebar')"
    style="display: flex"
    @click="sidebar.toggle"
  >
    <TbLayoutSidebarFilled style="scale: 1.15" v-show="sidebar.isOpen.value" />
    <TbLayoutSidebar style="scale: 1.15" v-show="!sidebar.isOpen.value" />
  </button>
</template>
