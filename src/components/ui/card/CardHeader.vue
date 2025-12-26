<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    data-slot="card-header"
    :class="cn('@container/card-header flex items-center justify-between gap-1.5 px-4 [.border-b]:pb-4', props.class)"
  >
    <slot />
  </div>
</template>
