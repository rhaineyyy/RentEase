<template>
  <ion-app>
    <ion-router-outlet :key="sessionEpoch" />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { sessionEpoch } from '@/services/auth';
</script>