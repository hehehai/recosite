<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ActionButton from "./ActionButton.vue";
import { usePageInfoActions } from "@/composables/usePageInfoActions";
import {
	useImageCompression,
	type CompressionFormat,
} from "@/composables/useImageCompression";
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
	faviconCopySuccess,
	faviconDownloadSuccess,
	copyText,
	copyMetaTags,
	copyPageInfoImage,
	downloadPageInfoImage,
	copyFavicon,
	downloadFavicon,
} = usePageInfoActions();

const {
	isCompressing,
	compressingFormat,
	compressAndDownload,
	COMPRESSION_FORMATS,
	DEFAULT_COMPRESSION_QUALITY,
} = useImageCompression();

const compressionQuality = ref(DEFAULT_COMPRESSION_QUALITY);
const activeCompressTarget = ref<"screenshot" | "og" | null>(null);

async function handleCompressDownload(
	dataUrl: string,
	fileName: string,
	format: CompressionFormat,
	target: "screenshot" | "og",
) {
	activeCompressTarget.value = target;
	await compressAndDownload(dataUrl, fileName, {
		format,
		quality: compressionQuality.value,
	});
	activeCompressTarget.value = null;
}
</script>

<template>
  <div class="flex-1 overflow-auto p-6">
    <div class="mx-auto max-w-8xl">
      <div class="flex gap-6 w-full">
        <!-- 左列：基本信息、Favicon、Meta 代码（40%） -->
        <div class="space-y-6 w-1/2">
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
                    class="size-20 rounded-lg border border-border bg-card object-contain p-1"
                    @error="
                      (e: Event) =>
                        ((e.target as HTMLImageElement).style.display = 'none')
                    "
                  />
                  <div
                    v-else
                    class="flex size-20 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
                  >
                    <span class="i-hugeicons-image-03" />
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

          <!-- Favicon -->
          <Card v-if="pageInfo.favicon">
            <CardHeader class="flex-row items-center justify-between pb-4">
              <CardTitle class="text-sm">
                {{ t("pageinfo_favicon") }}
              </CardTitle>
              <div class="flex gap-2">
                <ActionButton
                  action="copy"
                  variant="secondary"
                  :success="faviconCopySuccess"
                  @click="copyFavicon(pageInfo.favicon)"
                />
                <ActionButton
                  action="download"
                  :success="faviconDownloadSuccess"
                  @click="downloadFavicon(pageInfo.favicon)"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div
                class="flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted p-4"
              >
                <img
                  :src="pageInfo.favicon"
                  :alt="t('pageinfo_favicon')"
                  class="max-h-32 max-w-32 object-contain"
                  @error="
                    (e: Event) =>
                      ((e.target as HTMLImageElement).parentElement!.parentElement!.parentElement!.style.display =
                        'none')
                  "
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
                class="h-100 font-mono overflow-auto rounded-lg bg-muted p-4 text-sm text-foreground leading-relaxed"
              ><code>{{ pageInfo.metaTags }}</code></pre>
            </CardContent>
          </Card>
        </div>

        <!-- 右列：视窗截图、OG Image（60%） -->
        <div class="space-y-6 w-5xl">
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
                <ActionButton
                  action="copy"
                  variant="secondary"
                  @click="copyPageInfoImage(pageInfo.screenshot, 'Screenshot')"
                />
                <ActionButton
                  action="download"
                  @click="downloadPageInfoImage(pageInfo.screenshot, 'screenshot.png')"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      size="sm"
                      variant="outline"
                      :disabled="isCompressing && activeCompressTarget === 'screenshot'"
                    >
                      <span
                        v-if="isCompressing && activeCompressTarget === 'screenshot'"
                        class="i-hugeicons-loading-03 animate-spin"
                      />
                      <span v-else class="i-hugeicons-file-zip" />
                      {{ t("compress_download") }}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      v-for="format in COMPRESSION_FORMATS"
                      :key="format"
                      :disabled="isCompressing"
                      @click="handleCompressDownload(pageInfo.screenshot, 'screenshot', format, 'screenshot')"
                    >
                      <span class="uppercase">{{ format }}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

          <!-- OG Image -->
          <Card v-if="pageInfo.ogImage">
            <CardHeader class="flex-row items-center justify-between pb-4">
              <CardTitle class="text-sm">
                {{ t("pageinfo_og_image") }}
              </CardTitle>
              <div class="flex gap-2">
                <ActionButton
                  action="copy"
                  variant="secondary"
                  @click="copyPageInfoImage(pageInfo.ogImage, 'OG Image')"
                />
                <ActionButton
                  action="download"
                  @click="downloadPageInfoImage(pageInfo.ogImage, 'og-image.png')"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      size="sm"
                      variant="outline"
                      :disabled="isCompressing && activeCompressTarget === 'og'"
                    >
                      <span
                        v-if="isCompressing && activeCompressTarget === 'og'"
                        class="i-hugeicons-loading-03 animate-spin"
                      />
                      <span v-else class="i-hugeicons-file-zip" />
                      {{ t("compress_download") }}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      v-for="format in COMPRESSION_FORMATS"
                      :key="format"
                      :disabled="isCompressing"
                      @click="handleCompressDownload(pageInfo.ogImage, 'og-image', format, 'og')"
                    >
                      <span class="uppercase">{{ format }}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
        </div>
      </div>
    </div>
  </div>
</template>
