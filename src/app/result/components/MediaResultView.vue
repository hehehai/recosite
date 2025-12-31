<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	useImageCompression,
	useImageExport,
	useVideoExport,
} from "@/composables";
import { useClipboard } from "@/composables/useClipboard";
import { useFileDownload } from "@/composables/useFileDownload";
import type { CompressionFormat } from "@/composables/useImageCompression";
import {
	IMAGE_EXPORT_FORMATS,
	VIDEO_EXPORT_FORMATS,
} from "@/lib/constants/file-formats";
import { FILE_EXTENSION_REGEX } from "@/lib/constants/common";
import type { ImageFormat, VideoFormat } from "@/types/screenshot";
import { t } from "@/lib/i18n";
import ExportSizeSettings from "./ExportSizeSettings.vue";
import VideoPlayer from "./VideoPlayer.vue";
import VideoMetadataDialog from "./VideoMetadataDialog.vue";
import type { ExportSizeSettings as ExportSizeSettingsType } from "@/composables/useExportSize";
import { useVideoMetadata } from "@/composables/useVideoMetadata";
import { formatVideoDuration } from "@/lib/file";
import { toast } from "vue-sonner";

const props = defineProps<{
	resultType: "image" | "video";
	mediaData: string | null;
	svgData: string | null;
	fileName: string;
	width: number;
	height: number;
	originalFormat: string;
}>();

const { exportingFormat: imageExportingFormat, exportImage } = useImageExport();

const { exportingFormat: videoExportingFormat, exportVideo } = useVideoExport();

const {
	isCompressing,
	compressingFormat,
	compressAndDownload,
	COMPRESSION_FORMATS,
	DEFAULT_COMPRESSION_QUALITY,
} = useImageCompression();

const { copyImageFromDataUrl } = useClipboard();
const { downloadFromUrl } = useFileDownload();

// 压缩设置
const compressionQuality = ref(DEFAULT_COMPRESSION_QUALITY);

// 视频元数据相关
const { metadata: videoMetadata, extractMetadata } = useVideoMetadata();
const showMetadataDialog = ref(false);
const videoDuration = ref<string>();

// 导出状态
const exportingFormat = computed(
	() => imageExportingFormat.value || videoExportingFormat.value,
);
const copySuccess = ref(false);

// 导出尺寸设置
const exportSizeSettings = ref<ExportSizeSettingsType>({
	width: props.width || 0,
	height: props.height || 0,
	scale: 1,
	showOriginal: false,
});

// 预览图片URL（用于显示调整后的尺寸）
const previewImageUrl = ref<string>("");

// 图片导出选项
const imageExportFormats: ImageFormat[] = IMAGE_EXPORT_FORMATS;

// 视频导出选项
const videoExportFormats: VideoFormat[] = VIDEO_EXPORT_FORMATS;

// 当前可用的导出格式（如果有 SVG 数据，添加 SVG 选项）
const availableFormats = computed(() => {
	if (props.resultType === "image") {
		// 如果原始格式是 SVG，只显示 SVG
		if (props.originalFormat === "svg") {
			return ["svg"];
		}
		// 如果有 SVG 数据，添加 SVG 选项
		return props.svgData ? [...imageExportFormats, "svg"] : imageExportFormats;
	}
	return videoExportFormats;
});

// 监听导出尺寸设置变化
watch(
	exportSizeSettings,
	() => {
		if (props.resultType === "image") {
			generateResizedPreview();
		}
	},
	{ deep: true },
);

// 监听媒体数据加载完成
watch([() => props.mediaData, () => props.width, () => props.height], () => {
	if (props.mediaData && props.width && props.height) {
		exportSizeSettings.value = {
			width: props.width,
			height: props.height,
			scale: 1,
			showOriginal: false,
		};
		if (props.resultType === "image") {
			generateResizedPreview();
		}
	}
});

// 监听视频数据，提取元数据
watch([() => props.mediaData, () => props.resultType], async () => {
	if (props.mediaData && props.resultType === "video") {
		try {
			await extractMetadata(props.mediaData);
			if (videoMetadata.value) {
				videoDuration.value = formatVideoDuration(videoMetadata.value.duration);
			}
		} catch (err) {
			console.error("Failed to get video duration:", err);
		}
	}
});

async function handleExport(format: string) {
	if (!props.mediaData) {
		return;
	}

	if (props.resultType === "image") {
		// 处理 SVG 导出
		if (format === "svg") {
			if (!props.svgData) {
				toast.error(t("result_svg_unavailable"));
				return;
			}
			// 直接下载 SVG
			const svgFileName = props.fileName.replace(FILE_EXTENSION_REGEX, ".svg");
			const blob = await fetch(props.svgData).then((r) => r.blob());
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = svgFileName;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(t("result_exported_as", "SVG"));
			return;
		}

		// 准备导出的图片数据
		let exportData = props.mediaData;

		// 如果需要调整尺寸且不是显示原图，使用调整后的数据
		if (!exportSizeSettings.value.showOriginal && previewImageUrl.value) {
			exportData = previewImageUrl.value;
		}

		const result = await exportImage(
			exportData,
			props.fileName,
			props.originalFormat,
			format as ImageFormat,
		);
		if (result.success) {
			const sizeText = exportSizeSettings.value.showOriginal
				? t("result_original_badge")
				: `${exportSizeSettings.value.width}×${exportSizeSettings.value.height}`;
			toast.success(
				`${t("result_exported_as", format.toUpperCase())} (${sizeText})`,
			);
		} else {
			toast.error(result.error || t("result_export_failed"));
		}
	} else {
		toast.info(t("result_converting_to", format.toUpperCase()));
		const sizeSettings =
			exportSizeSettings.value && exportSizeSettings.value.scale !== 1
				? exportSizeSettings.value
				: undefined;

		const result = await exportVideo(
			props.mediaData,
			props.fileName,
			props.originalFormat,
			format as VideoFormat,
			sizeSettings,
		);
		if (result.success) {
			let sizeText = t("video_unknown");
			if (exportSizeSettings.value) {
				if (exportSizeSettings.value.scale === 1) {
					sizeText = t("result_original_badge");
				} else {
					sizeText = `${exportSizeSettings.value.width}×${exportSizeSettings.value.height}`;
				}
			}
			toast.success(
				`${t("result_export_success", format.toUpperCase())} (${sizeText})`,
			);
		} else {
			toast.error(result.error || t("result_export_failed"));
		}
	}
}

async function handleCopyToClipboard() {
	if (!props.mediaData) {
		return;
	}

	if (props.resultType === "image") {
		// 如果需要调整尺寸且不是显示原图，使用调整后的数据
		let copyData = props.mediaData;
		if (!exportSizeSettings.value.showOriginal && previewImageUrl.value) {
			copyData = previewImageUrl.value;
		}

		const sizeText = exportSizeSettings.value.showOriginal
			? t("result_original_badge")
			: `${exportSizeSettings.value.width}×${exportSizeSettings.value.height}`;

		const success = await copyImageFromDataUrl(copyData, {
			successMessage: `${t("result_copied_to_clipboard")} (${sizeText})`,
		});

		if (success) {
			copySuccess.value = true;
			setTimeout(() => {
				copySuccess.value = false;
			}, 2000);
		}
	} else {
		// 视频不支持复制到剪贴板，直接下载
		downloadFromUrl(props.mediaData, props.fileName, {
			successMessage: t("result_copied_to_clipboard"),
		});
	}
}

// 生成调整后的图片预览
async function generateResizedPreview() {
	if (
		!props.mediaData ||
		props.resultType !== "image" ||
		exportSizeSettings.value.showOriginal
	) {
		previewImageUrl.value = props.mediaData || "";
		return;
	}

	try {
		// 创建图片元素
		const img = new Image();
		img.crossOrigin = "anonymous";

		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
			img.src = props.mediaData!;
		});

		// 创建canvas来调整尺寸
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Cannot get canvas context");
		}

		canvas.width = exportSizeSettings.value.width;
		canvas.height = exportSizeSettings.value.height;

		// 绘制调整后的图片
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

		// 转换为data URL
		previewImageUrl.value = canvas.toDataURL("image/png");
	} catch (previewError) {
		console.error("Failed to generate preview:", previewError);
		previewImageUrl.value = props.mediaData || "";
	}
}

function handleShowDetails() {
	showMetadataDialog.value = true;
}

function handleCloseDetails() {
	showMetadataDialog.value = false;
}

// 处理压缩下载
async function handleCompressDownload(format: CompressionFormat) {
	if (!props.mediaData) {
		return;
	}

	// 使用调整后的图片数据（如果有）
	let compressData = props.mediaData;
	if (!exportSizeSettings.value.showOriginal && previewImageUrl.value) {
		compressData = previewImageUrl.value;
	}

	await compressAndDownload(compressData, props.fileName, {
		format,
		quality: compressionQuality.value,
	});
}
</script>

<template>
  <div class="flex flex-1 gap-6 overflow-hidden p-6">
    <!-- 左侧：预览区域 -->
    <Card class="flex flex-1 flex-col overflow-hidden gap-0 py-0">
      <CardHeader class="border-b border-border [.border-b]:pb-3 pt-4">
        <CardTitle class="text-sm">{{ t("result_preview") }}</CardTitle>
      </CardHeader>
      <CardContent class="flex-1 bg-muted/20 p-6">
        <div class="flex items-center justify-center overflow-auto">
          <!-- 图片预览 -->
          <img
            v-if="resultType === 'image'"
            :src="previewImageUrl || mediaData || undefined"
            :alt="fileName"
            class="max-h-full max-w-full rounded shadow-lg"
          />

          <!-- 视频预览 -->
          <VideoPlayer
            v-else
            :data-url="mediaData || ''"
            :target-width="exportSizeSettings && exportSizeSettings.scale !== 1
            ? exportSizeSettings.width
            : undefined
            "
            :target-height="exportSizeSettings && exportSizeSettings.scale !== 1
              ? exportSizeSettings.height
              : undefined
              "
            :original-width="width || undefined"
            :original-height="height || undefined"
          />
        </div>
      </CardContent>
    </Card>

    <!-- 右侧：操作面板 -->
    <div class="w-80 shrink-0 space-y-4">
      <!-- 导出尺寸设置 -->
      <ExportSizeSettings
        v-model="exportSizeSettings"
        :original-width="width || 0"
        :original-height="height || 0"
      />

      <!-- 快速操作 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-sm">
            {{ t("result_quick_actions") }}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <Button
            v-if="resultType === 'video'"
            variant="outline"
            class="w-full gap-2 border-primary bg-primary/10 text-primary hover:bg-primary/20"
            @click="handleShowDetails"
          >
            <span class="i-hugeicons-film-02" />
            <span>{{ t("result_video_details") }}</span>
          </Button>
          <Button class="w-full gap-2" @click="handleCopyToClipboard">
            <span class="i-hugeicons-copy-01" />
            <span>
              {{
                copySuccess
                  ? t("result_copied_to_clipboard")
                  : resultType === "image"
                    ? t("result_copy_to_clipboard")
                    : t("result_download_video")
              }}
            </span>
          </Button>
        </CardContent>
      </Card>

      <!-- 导出选项 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-sm">
            {{ t("result_export_format") }}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <Button
            v-for="format in availableFormats"
            :key="format"
            :variant="format === originalFormat ? 'outline' : 'secondary'"
            :disabled="exportingFormat === format"
            :class="[
              'w-full justify-between',
              format === originalFormat &&
              'border-success/50 bg-success/10 text-success hover:bg-success/20',
            ]"
            @click="handleExport(format)"
          >
            <span class="flex items-center gap-2">
              <svg
                v-if="exportingFormat !== format"
                class="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <Spinner v-else class="size-5" />
              <span class="uppercase">{{ format }}</span>
            </span>
            <span
              v-if="format === originalFormat"
              class="rounded bg-success/20 px-2 py-0.5 text-xs font-medium text-success"
            >
              {{ t("result_original_badge") }}
            </span>
          </Button>
          <p class="mt-3 text-xs text-muted-foreground">
            {{ t("result_format_tip") }}
          </p>
        </CardContent>
      </Card>

      <!-- 压缩下载（仅图片） -->
      <Card v-if="resultType === 'image'">
        <CardHeader>
          <CardTitle class="text-sm">
            {{ t("compress_download") }}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <!-- 质量设置 -->
          <div class="flex items-center gap-3">
            <label class="text-xs text-muted-foreground whitespace-nowrap">
              {{ t("compress_quality") }}
            </label>
            <Input
              v-model.number="compressionQuality"
              type="number"
              min="1"
              max="100"
              class="h-8 w-20 text-center"
            />
            <span class="text-xs text-muted-foreground">%</span>
          </div>
          <p class="text-xs text-muted-foreground">
            {{ t("compress_quality_tip") }}
          </p>
          <!-- 压缩格式按钮 -->
          <div class="space-y-2">
            <Button
              v-for="format in COMPRESSION_FORMATS"
              :key="format"
              variant="secondary"
              :disabled="isCompressing && compressingFormat === format"
              class="w-full justify-between"
              @click="handleCompressDownload(format)"
            >
              <span class="flex items-center gap-2">
                <span
                  v-if="!(isCompressing && compressingFormat === format)"
                  class="i-hugeicons-file-zip"
                />
                <Spinner v-else class="size-5" />
                <span class="uppercase">{{ format }}</span>
              </span>
              <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {{ compressionQuality }}%
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- 提示信息 -->
      <Alert class="border-primary/30 bg-primary/10">
        <svg class="size-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <AlertTitle class="text-primary">{{ t("result_tip") }}</AlertTitle>
        <AlertDescription class="text-primary/80">
          {{
            resultType === "image"
              ? t("result_jpeg_tip")
              : t("result_mp4_tip")
          }}
        </AlertDescription>
      </Alert>
    </div>

    <!-- 视频元数据对话框 -->
    <VideoMetadataDialog
      v-if="resultType === 'video'"
      :show="showMetadataDialog"
      :data-url="mediaData || ''"
      @close="handleCloseDetails"
    />
  </div>
</template>
