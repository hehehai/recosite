<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PageInfo } from "@/types/screenshot";
import { t } from "@/lib/i18n";

defineProps<{
  pageInfo: PageInfo;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <header class="border-b border-border bg-card">
    <div class="mx-auto max-w-screen-2xl px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo 和标题 -->
        <div class="flex items-center gap-4">
          <div
            class="flex size-10 text-white text-2xl items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-purple-600"
          >
            <span class="i-hugeicons-web-design-01" />
          </div>
          <div>
            <h1 class="text-lg font-semibold text-foreground">
              {{ t("pageinfo_title") }}
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

      <!-- 页面信息 -->
      <div class="mt-4 flex flex-wrap gap-6 text-sm">
        <div class="flex items-center gap-2">
          <span class="font-medium text-muted-foreground">
            {{ t("pageinfo_url") }}
          </span>
          <Badge variant="secondary" class="font-mono max-w-md truncate">
            {{ pageInfo.url }}
          </Badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-medium text-muted-foreground">
            {{ t("pageinfo_title") }}
          </span>
          <Badge variant="secondary" class="font-mono max-w-md truncate">
            {{ pageInfo.title || t("pageinfo_no_title") }}
          </Badge>
        </div>
      </div>
    </div>
  </header>
</template>
