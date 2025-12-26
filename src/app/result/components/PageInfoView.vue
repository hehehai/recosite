<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePageInfoActions } from "@/composables/usePageInfoActions";
import type { PageInfo } from "@/types/screenshot";
import { t } from "@/lib/i18n";

const props = defineProps<{
  pageInfo: PageInfo;
}>();

const emit = defineEmits<{
  close: [];
}>();

const {
  urlCopySuccess,
  titleCopySuccess,
  descCopySuccess,
  metaCopySuccess,
  copyText,
  copyMetaTags,
  copyPageInfoImage,
  downloadPageInfoImage,
} = usePageInfoActions();
</script>

<template>
  <div class="flex-1 overflow-auto p-6">
    <div class="mx-auto max-w-4xl space-y-6">
      <!-- 基本信息卡片 -->
      <Card>
        <CardContent>
          <div class="flex items-start gap-4">
            <!-- Favicon -->
            <div class="shrink-0">
              <img
                v-if="pageInfo.favicon"
                :src="pageInfo.favicon"
                :alt="t('pageinfo_favicon')"
                class="size-12 rounded-lg border border-border bg-card object-contain p-1"
                @error="
                  (e: Event) =>
                    ((e.target as HTMLImageElement).style.display = 'none')
                "
              />
              <div
                v-else
                class="flex size-12 items-center justify-center rounded-lg border border-border bg-muted"
              >
                <svg
                  class="size-6 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
            </div>
            <!-- 信息 -->
            <div class="min-w-0 flex-1 space-y-3">
              <!-- URL -->
              <div>
                <div class="flex items-center justify-between">
                  <label class="text-xs font-medium text-muted-foreground">
                    {{ t("pageinfo_url") }}
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-6 gap-1 px-1.5 text-xs"
                    @click="
                    copyText(
                      pageInfo.url,
                      'url',
                      'pageinfo_url_copied'
                    )
                    "
                  >
                    <span v-if="!urlCopySuccess" class="i-hugeicons-copy-01" />
                    <span v-else class="i-hugeicons-checkmark-circle-01" />
                    {{
                      urlCopySuccess
                        ? t("pageinfo_copied")
                        : t("pageinfo_copy")
                    }}
                  </Button>
                </div>
                <a
                  :href="pageInfo.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-1 block truncate text-sm text-primary hover:underline"
                >
                  {{ pageInfo.url }}
                </a>
              </div>
              <!-- 标题 -->
              <div>
                <div class="flex items-center justify-between">
                  <label class="text-xs font-medium text-muted-foreground">
                    {{ t("pageinfo_page_title") }}
                  </label>
                  <Button
                    v-if="pageInfo.title"
                    variant="ghost"
                    size="sm"
                    class="h-6 gap-1 px-1.5 text-xs"
                    @click="
                    copyText(
                      pageInfo.title,
                      'title',
                      'pageinfo_title_copied'
                    )
                    "
                  >
                    <span v-if="!titleCopySuccess" class="i-hugeicons-copy-01" />
                    <span v-else class="i-hugeicons-checkmark-circle-01" />
                    {{
                      titleCopySuccess
                        ? t("pageinfo_copied")
                        : t("pageinfo_copy")
                    }}
                  </Button>
                </div>
                <p class="mt-1 text-sm font-medium text-foreground">
                  {{ pageInfo.title || t("pageinfo_no_title") }}
                </p>
              </div>
              <!-- 描述 -->
              <div>
                <div class="flex items-center justify-between">
                  <label class="text-xs font-medium text-muted-foreground">
                    {{ t("pageinfo_description") }}
                  </label>
                  <Button
                    v-if="pageInfo.description"
                    variant="ghost"
                    size="sm"
                    class="h-6 gap-1 px-1.5 text-xs"
                    @click="
                    copyText(
                      pageInfo.description,
                      'desc',
                      'pageinfo_desc_copied'
                    )
                    "
                  >
                    <span v-if="!descCopySuccess" class="i-hugeicons-copy-01" />
                    <span v-else class="i-hugeicons-checkmark-circle-01" />
                    {{
                      descCopySuccess
                        ? t("pageinfo_copied")
                        : t("pageinfo_copy")
                    }}
                  </Button>
                </div>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ pageInfo.description || t("pageinfo_no_description") }}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- OG Image -->
      <Card v-if="pageInfo.ogImage">
        <CardHeader class="flex-row items-center justify-between pb-4">
          <CardTitle class="text-sm">
            {{ t("pageinfo_og_image") }}
          </CardTitle>
          <div class="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              @click="copyPageInfoImage(pageInfo.ogImage, 'OG Image')"
            >
              <span class="i-hugeicons-copy-01" />
              {{ t("pageinfo_copy") }}
            </Button>
            <Button
              size="sm"
              @click="
              downloadPageInfoImage(pageInfo.ogImage, 'og-image.png')
              "
            >
              <span class="i-hugeicons-download-01" />
              {{ t("pageinfo_download") }}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div class="overflow-hidden rounded-lg border border-border bg-muted">
            <img
              :src="pageInfo.ogImage"
              :alt="t('pageinfo_og_image')"
              class="max-h-80 w-full object-contain"
              @error="
              (e: Event) =>
              ((e.target as HTMLImageElement).parentElement!.style.display =
                'none')
            "
            />
          </div>
        </CardContent>
      </Card>

      <!-- 视窗截图 -->
      <Card>
        <CardHeader class="flex-row items-center justify-between pb-4">
          <CardTitle class="text-sm">
            {{ t("pageinfo_screenshot") }}
            <span class="ml-2 text-xs font-normal text-muted-foreground">
              ({{ pageInfo.width }}×{{ pageInfo.height }})
            </span>
          </CardTitle>
          <div class="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              @click="copyPageInfoImage(pageInfo.screenshot, 'Screenshot')"
            >
              <span class="i-hugeicons-copy-01" />
              {{ t("pageinfo_copy") }}
            </Button>
            <Button
              size="sm"
              @click="
              downloadPageInfoImage(pageInfo.screenshot, 'screenshot.png')
              "
            >
              <span class="i-hugeicons-download-01" />
              {{ t("pageinfo_download") }}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div class="overflow-hidden rounded-lg border border-border bg-muted">
            <img
              :src="pageInfo.screenshot"
              :alt="t('pageinfo_screenshot')"
              class="max-h-96 w-full object-contain"
            />
          </div>
        </CardContent>
      </Card>

      <!-- Meta 标签代码 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-sm">
            {{ t("pageinfo_meta_tags") }}
          </CardTitle>
          <Button size="sm" @click="copyMetaTags(pageInfo.metaTags)">
            <span v-if="!metaCopySuccess" class="i-hugeicons-copy-01" />
            <span v-else class="i-hugeicons-checkmark-circle-01" />
            {{
              metaCopySuccess
                ? t("pageinfo_copied")
                : t("pageinfo_copy_meta")
            }}
          </Button>
        </CardHeader>
        <CardContent>
          <pre
            class="font-mono overflow-auto rounded-lg bg-muted p-4 text-sm text-foreground leading-relaxed"
          ><code>{{ pageInfo.metaTags }}</code></pre>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
