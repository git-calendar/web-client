<script setup lang="ts"></script>

<template>
  <main>
    <span id="alpha">Alpha version</span>
    <RouterView />
  </main>
</template>

<style scoped>
main {
  height: 100%;
}

#alpha {
  position: absolute;
  top: 1rem;
  left: calc(var(--sidebar-width) + 1rem);
  padding: 0.1rem 0.3rem;

  font-size: 0.7rem;
  font-weight: bold;
  color: var(--git-color);
  border: 1px solid var(--git-color);
  border-radius: 2rem;
}
</style>
