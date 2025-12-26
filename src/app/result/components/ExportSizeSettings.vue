<script setup lang="ts">
import { watch } from "vue";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ExportSizeSettings,
  useExportSize,
} from "@/composables/useExportSize";
import { t } from "@/lib/i18n";
import Input from "@/components/ui/input/Input.vue";
import { Button } from "@/components/ui/button";

interface Props {
  originalWidth: number;
  originalHeight: number;
  modelValue?: ExportSizeSettings;
}

type Emits = (e: "update:modelValue", value: ExportSizeSettings) => void;

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 使用 composable hook
const {
  currentScale,
  currentWidth,
  currentHeight,
  showOriginal,
  presetScales,
  onScaleChange,
  onWidthChange,
  onHeightChange,
  toggleShowOriginal,
  formatScale,
  setSettings,
} = useExportSize({
  originalWidth: props.originalWidth,
  originalHeight: props.originalHeight,
  initialValue: props.modelValue,
});

// 发送更新事件
function emitUpdate() {
  emit("update:modelValue", {
    width: currentWidth.value,
    height: currentHeight.value,
    scale: currentScale.value,
    showOriginal: showOriginal.value,
  });
}

// 包装事件处理函数，在调用后发送更新事件
function handleScaleChange(newScale: string) {
  onScaleChange(Number(newScale));
  emitUpdate();
}

function handleWidthChange(event: Event) {
  const target = event.target as HTMLInputElement;
  onWidthChange(Number(target.value));
  emitUpdate();
}

function handleHeightChange(event: Event) {
  const target = event.target as HTMLInputElement;
  onHeightChange(Number(target.value));
  emitUpdate();
}

function handleToggleShowOriginal() {
  toggleShowOriginal();
  emitUpdate();
}

// 监听外部变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      setSettings(newValue);
    }
  },
  { deep: true }
);
</script>

<template>
  <Card class="p-4">
    <!-- 卡片 Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-card-foreground">
          {{ t("export_dimensions") }}
        </h3>
        <Badge variant="outline" class="border-primary/30 bg-primary/10 text-primary">
          {{
            showOriginal
              ? `${originalWidth} × ${originalHeight}`
              : `${currentWidth} × ${currentHeight}`
          }}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        :class="[
        showOriginal && 'bg-primary/10 text-primary hover:bg-primary/20',
      ]"
        :title="showOriginal ? t('export_show_adjusted') : t('export_show_original')
        "
        @click="handleToggleShowOriginal"
      >
        <!-- 眼睛图标 -->
        <span v-if="showOriginal" class="i-hugeicons-view" />
        <span v-else class="i-hugeicons-view-off-slash" />
      </Button>
    </div>

    <!-- 卡片内容 -->
    <div class="space-y-3">
      <!-- 缩放控制和尺寸输入 -->
      <div class="flex items-center gap-2">
        <!-- 左侧：缩放下拉列表 -->
        <div class="w-20">
          <Select
            :model-value="String(currentScale)"
            @update:model-value="(value) => handleScaleChange(value as string)"
          >
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="scale in presetScales" :key="scale" :value="String(scale)">
                {{ formatScale(scale) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 右侧：宽高输入框 -->
        <div class="flex items-center gap-1.5">
          <!-- 宽度输入 -->
          <div class="flex items-center gap-1">
            <label class="text-xs text-muted-foreground">
              {{ t("export_width") }}
            </label>
            <Input
              :model-value="currentWidth"
              type="number"
              min="100"
              max="10000"
              class="h-9 w-20 px-2 text-xs"
              @input="handleWidthChange"
            />
          </div>

          <!-- 高度输入 -->
          <div class="flex items-center gap-1">
            <label class="text-xs text-muted-foreground">
              {{ t("export_height") }}
            </label>
            <Input
              :model-value="currentHeight"
              type="number"
              min="100"
              max="10000"
              class="h-9 w-20 px-2 text-xs"
              @input="handleHeightChange"
            />
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
