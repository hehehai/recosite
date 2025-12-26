<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    data-slot="item-footer"
    :class="cn('flex basis-full items-center justify-between gap-2', props.class)"
  >
    <<<<<<< Updated upstream
    <slot />
    =======
    <slot />
    >>>>>>> Stashed changes
  </div>
</template>
