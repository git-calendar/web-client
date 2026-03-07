<script setup lang="ts">
interface Props {
  topStyle: string;
  heightStyle: string;
  title: string;
  subtitle: string;
}
const props = defineProps<Props>();
</script>

<template>
  <div class="timeline-event" :style="{ top: topStyle, height: heightStyle }">
    <span>{{ title }}</span>
    <br />
    <span>{{ subtitle }}</span>
  </div>
</template>

<style scoped>
.timeline-event {
  position: absolute;
  left: 0;
  right: 0;
  background-color: rgba(100, 149, 237, 0.5);
  border-left: 3px solid #6495ed;
  padding: 0.2rem;
  font-size: 0.75rem;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  user-select: none;
  -webkit-user-select: none; /* safari dumbass */
}
</style>
