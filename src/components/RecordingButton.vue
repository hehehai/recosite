<script setup lang="ts">
import { Button } from "@/components/ui/button";

interface Props {
  disabled?: boolean;
  active?: boolean;
  animate?: boolean;
  label: string;
  sublabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  active: false,
  animate: false,
});

defineEmits<{
  click: [];
}>();
</script>

<template>
  <Button
    variant="outline"
    :disabled="disabled"
    :class="[
      'flex-1 h-auto flex flex-col justify-center items-center gap-1.5 p-5 border-2 rounded-xl',
      active
        ? 'bg-destructive/10 border-destructive'
        : 'hover:border-primary active:border-accent',
      animate && 'animate-pulse',
    ]"
    @click="$emit('click')"
  >
    <div :class="['size-10', active ? 'text-destructive' : 'text-muted-foreground']">
      <slot name="icon" />
    </div>
    <div v-if="active && sublabel" class="text-center">
      <div
        :class="[
          'text-xs font-bold',
          active ? 'text-destructive' : 'text-foreground',
        ]"
      >
        {{ label }}
      </div>
      <div class="mt-0.5 text-[10px] text-destructive">{{ sublabel }}</div>
    </div>
    <span
      v-else
      :class="[
        'text-xs font-medium',
        active ? 'text-destructive' : 'text-foreground',
      ]"
    >
      {{ label }}
    </span>
  </Button>
</template>
