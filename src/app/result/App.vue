<script setup lang="ts">
import { onMounted } from "vue";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import { useResultData } from "@/composables";
import { t } from "@/lib/i18n";
import MediaResultView from "./components/MediaResultView.vue";
import MediaResultHeader from "./components/MediaResultHeader.vue";
import PageInfoView from "./components/PageInfoView.vue";
import PageInfoHeader from "./components/PageInfoHeader.vue";
import { Button } from "@/components/ui/button";

// 使用 composables
const {
	resultType,
	mediaData,
	svgData,
	fileName,
	width,
	height,
	originalFormat,
	loading,
	error,
	pageInfo,
	fileSizeFormatted,
	resultTypeLabel,
	loadResultData,
} = useResultData();

onMounted(async () => {
	const params = new URLSearchParams(window.location.search);
	const resultId = params.get("id");

	if (!resultId) {
		error.value = t("result_no_data");
		loading.value = false;
		return;
	}

	await loadResultData(resultId);
});

function handleClose() {
	window.close();
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <!-- 顶部信息栏 - 媒体结果 -->
    <MediaResultHeader
      v-if="!loading && !error && (resultType === 'image' || resultType === 'video')"
      :result-type-label="resultTypeLabel"
      :file-name="fileName"
      :original-format="originalFormat"
      :width="width"
      :height="height"
      :file-size-formatted="fileSizeFormatted"
      :is-video="resultType === 'video'"
      @close="handleClose"
    />

    <!-- 顶部信息栏 - 页面信息 -->
    <PageInfoHeader
      v-if="!loading && !error && resultType === 'pageinfo' && pageInfo"
      :page-info="pageInfo"
      @close="handleClose"
    />

    <!-- 主内容区域 -->
    <main class="flex flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-1 items-center justify-center">
        <div class="text-center">
          <Spinner class="mx-auto size-16" />
          <p class="mt-4 text-muted-foreground">{{ t("result_loading") }}</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex flex-col flex-1 items-center justify-center gap-8 p-8">
        <Alert variant="destructive" class="max-w-md justify-center gap-4">
          <AlertTitle class="flex flex-col items-center justify-center gap-2">
            <span class="i-hugeicons-rss-error text-3xl" />
            <span class="text-lg font-semibold">{{ t("result_error_title") }}</span>
          </AlertTitle>
          <AlertDescription>
            <p class="mx-auto">{{ error }}</p>
          </AlertDescription>
        </Alert>
        <Button variant="outline" @click="handleClose">
          <span>{{ t("result_close") }}</span>
        </Button>
      </div>

      <!-- 页面信息显示 -->
      <PageInfoView
        v-else-if="resultType === 'pageinfo' && pageInfo"
        :page-info="pageInfo"
        @close="handleClose"
      />

      <!-- 媒体结果显示（截图/录制） -->
      <MediaResultView
        v-else-if="mediaData && (resultType === 'image' || resultType === 'video')"
        :result-type="resultType as 'image' | 'video'"
        :media-data="mediaData"
        :svg-data="svgData"
        :file-name="fileName"
        :width="width"
        :height="height"
        :original-format="originalFormat"
      />
    </main>

    <Toaster />
  </div>
</template>
