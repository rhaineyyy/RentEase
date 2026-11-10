<template>
  <ion-app>
    <ion-router-outlet :key="sessionEpoch" />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { sessionEpoch } from '@/services/auth';
import { initTheme } from '@/services/theme';

onMounted(() => {
  initTheme();
});
</script>