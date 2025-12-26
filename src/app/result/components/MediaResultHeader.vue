<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

defineProps<{
  resultTypeLabel: string;
  fileName: string;
  originalFormat: string;
  width: number;
  height: number;
  fileSizeFormatted: string;
  isVideo: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <header class="border-b border-border bg-card">
    <div class="mx-auto max-w-screen-2xl py-4">
      <div class="flex items-center justify-between">
        <!-- Logo 和标题 -->
        <div class="flex items-center gap-4">
          <div
            class="flex size-10 text-white text-2xl items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-purple-600"
          >
            <span v-if="isVideo" class="i-hugeicons-video-01" />
            <span v-else class="i-hugeicons-image-02" />
          </div>
          <div>
            <h1 class="text-lg font-semibold text-foreground">
              {{ resultTypeLabel }}
              {{ t("result_title_suffix") }}
            </h1>
            <p class="text-sm text-muted-foreground">
              {{ t("result_page_title") }}
            </p>
          </div>
        </div>

        <!-- 按钮组 -->
        <div class="flex gap-2">
          <Button variant="outline" @click="emit('close')">
            {{ t("result_close") }}
          </Button>
        </div>
      </div>

      <!-- 文件信息 -->
      <div class="mt-4 flex flex-wrap gap-6 text-sm">
        <div class="flex items-center gap-2">
          <span class="font-medium text-muted-foreground">{{
            t("result_filename")
          }}</span>
          <Badge variant="secondary" class="font-mono">{{ fileName }}</Badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-medium text-muted-foreground">{{
            t("result_format")
          }}</span>
          <Badge
            variant="outline"
            class="border-primary/30 bg-primary/10 font-mono uppercase text-primary"
          >
            {{ originalFormat }}
          </Badge>
        </div>
        <div v-if="!isVideo" class="flex items-center gap-2">
          <span class="font-medium text-muted-foreground">{{
            t("result_dimensions")
          }}</span>
          <Badge variant="outline" class="border-success/30 bg-success/10 font-mono text-success">
            {{ width }}× {{ height }}
          </Badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-medium text-muted-foreground">{{
            t("result_filesize")
          }}</span>
          <Badge variant="secondary" class="font-mono">
            {{ fileSizeFormatted }}
          </Badge>
        </div>
      </div>
    </div>
  </header>
</template>
