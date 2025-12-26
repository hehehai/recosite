import { type Ref, ref } from "vue";
import { DEFAULT_VALUES, PRESET_SCALES, SIZE_LIMITS } from "@/lib/constants/export-size";

export interface ExportSizeSettings {
  width: number;
  height: number;
  scale: number;
  showOriginal: boolean;
}

export interface UseExportSizeOptions {
  originalWidth: number;
  originalHeight: number;
  initialValue?: Partial<ExportSizeSettings>;
}

export function useExportSize(options: UseExportSizeOptions) {
  const { originalWidth, originalHeight, initialValue } = options;

  // 内部状态
  const currentScale = ref(initialValue?.scale ?? DEFAULT_VALUES.SCALE);
  const currentWidth = ref(initialValue?.width ?? originalWidth);
  const currentHeight = ref(initialValue?.height ?? originalHeight);
  const showOriginal = ref(initialValue?.showOriginal ?? DEFAULT_VALUES.SHOW_ORIGINAL);

  // 计算等比缩放后的尺寸
  function calculateDimensions(scale: number) {
    const newWidth = Math.round(originalWidth * scale);
    const newHeight = Math.round(originalHeight * scale);

    // 应用宽高限制
    const clampedWidth = Math.max(SIZE_LIMITS.MIN_WIDTH, Math.min(SIZE_LIMITS.MAX_WIDTH, newWidth));
    const clampedHeight = Math.max(
      SIZE_LIMITS.MIN_HEIGHT,
      Math.min(SIZE_LIMITS.MAX_HEIGHT, newHeight),
    );

    return { width: clampedWidth, height: clampedHeight };
  }

  // 限制数值在指定范围内
  function clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // 当缩放比例改变时，更新尺寸
  function onScaleChange(newScale: number) {
    currentScale.value = newScale;
    const dimensions = calculateDimensions(newScale);
    currentWidth.value = dimensions.width;
    currentHeight.value = dimensions.height;

    return getCurrentSettings();
  }

  // 当宽度改变时，按比例调整高度
  function onWidthChange(newWidth: number) {
    const clampedWidth = clampValue(newWidth, SIZE_LIMITS.MIN_WIDTH, SIZE_LIMITS.MAX_WIDTH);
    currentWidth.value = clampedWidth;
    currentScale.value = clampedWidth / originalWidth;
    currentHeight.value = Math.round(originalHeight * currentScale.value);

    // 确保高度也在范围内
    if (currentHeight.value < SIZE_LIMITS.MIN_HEIGHT) {
      currentHeight.value = SIZE_LIMITS.MIN_HEIGHT;
      currentScale.value = currentHeight.value / originalHeight;
      currentWidth.value = Math.round(originalWidth * currentScale.value);
    } else if (currentHeight.value > SIZE_LIMITS.MAX_HEIGHT) {
      currentHeight.value = SIZE_LIMITS.MAX_HEIGHT;
      currentScale.value = currentHeight.value / originalHeight;
      currentWidth.value = Math.round(originalWidth * currentScale.value);
    }

    return getCurrentSettings();
  }

  // 当高度改变时，按比例调整宽度
  function onHeightChange(newHeight: number) {
    const clampedHeight = clampValue(newHeight, SIZE_LIMITS.MIN_HEIGHT, SIZE_LIMITS.MAX_HEIGHT);
    currentHeight.value = clampedHeight;
    currentScale.value = clampedHeight / originalHeight;
    currentWidth.value = Math.round(originalWidth * currentScale.value);

    // 确保宽度也在范围内
    if (currentWidth.value < SIZE_LIMITS.MIN_WIDTH) {
      currentWidth.value = SIZE_LIMITS.MIN_WIDTH;
      currentScale.value = currentWidth.value / originalWidth;
      currentHeight.value = Math.round(originalHeight * currentScale.value);
    } else if (currentWidth.value > SIZE_LIMITS.MAX_WIDTH) {
      currentWidth.value = SIZE_LIMITS.MAX_WIDTH;
      currentScale.value = currentWidth.value / originalWidth;
      currentHeight.value = Math.round(originalWidth * currentScale.value);
    }

    return getCurrentSettings();
  }

  // 切换原图预览
  function toggleShowOriginal() {
    showOriginal.value = !showOriginal.value;
    return getCurrentSettings();
  }

  // 获取当前设置
  function getCurrentSettings(): ExportSizeSettings {
    return {
      width: currentWidth.value,
      height: currentHeight.value,
      scale: currentScale.value,
      showOriginal: showOriginal.value,
    };
  }

  // 格式化预设比例显示
  function formatScale(scale: number): string {
    return scale === 1 ? "1x" : `${scale}x`;
  }

  // 设置外部值
  function setSettings(settings: Partial<ExportSizeSettings>) {
    if (settings.scale !== undefined) {
      currentScale.value = settings.scale;
    }
    if (settings.width !== undefined) {
      currentWidth.value = settings.width;
    }
    if (settings.height !== undefined) {
      currentHeight.value = settings.height;
    }
    if (settings.showOriginal !== undefined) {
      showOriginal.value = settings.showOriginal;
    }
  }

  // 重置到原始尺寸
  function resetToOriginal() {
    currentScale.value = DEFAULT_VALUES.SCALE;
    currentWidth.value = originalWidth;
    currentHeight.value = originalHeight;
    showOriginal.value = DEFAULT_VALUES.SHOW_ORIGINAL;

    return getCurrentSettings();
  }

  return {
    // 状态
    currentScale: currentScale as Ref<number>,
    currentWidth: currentWidth as Ref<number>,
    currentHeight: currentHeight as Ref<number>,
    showOriginal: showOriginal as Ref<boolean>,

    // 常量
    presetScales: PRESET_SCALES,

    // 方法
    onScaleChange,
    onWidthChange,
    onHeightChange,
    toggleShowOriginal,
    formatScale,
    setSettings,
    resetToOriginal,
    getCurrentSettings,

    // 计算方法
    calculateDimensions,
    clampValue,
  };
}
