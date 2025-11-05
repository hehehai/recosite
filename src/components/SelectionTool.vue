<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from "vue";
import type { SelectionArea } from "@/types/screenshot";

const onComplete = inject<(area: SelectionArea) => void>("onComplete");
const onCancel = inject<() => void>("onCancel");

const isDrawing = ref(false);
const startX = ref(0);
const startY = ref(0);
const currentX = ref(0);
const currentY = ref(0);
const showTip = ref(true);
const countdown = ref(3);

let countdownTimer: number | null = null;

const selectionArea = computed<SelectionArea>(() => {
    const x = Math.min(startX.value, currentX.value);
    const y = Math.min(startY.value, currentY.value);
    const width = Math.abs(currentX.value - startX.value);
    const height = Math.abs(currentY.value - startY.value);

    return { x, y, width, height };
});

const selectionStyle = computed(() => ({
    left: `${selectionArea.value.x}px`,
    top: `${selectionArea.value.y}px`,
    width: `${selectionArea.value.width}px`,
    height: `${selectionArea.value.height}px`,
}));

function handleMouseDown(event: MouseEvent) {
    isDrawing.value = true;
    startX.value = event.clientX + window.scrollX;
    startY.value = event.clientY + window.scrollY;
    currentX.value = startX.value;
    currentY.value = startY.value;
}

function handleMouseMove(event: MouseEvent) {
    if (!isDrawing.value) {
        return;
    }

    currentX.value = event.clientX + window.scrollX;
    currentY.value = event.clientY + window.scrollY;
}

function handleMouseUp() {
    if (!isDrawing.value) {
        return;
    }

    isDrawing.value = false;

    // 如果选区太小，视为取消
    if (selectionArea.value.width < 10 || selectionArea.value.height < 10) {
        handleCancel();
        return;
    }

    onComplete?.(selectionArea.value);
}

function handleCancel() {
    onCancel?.();
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
        handleCancel();
    }
}

onMounted(() => {
    document.addEventListener("keydown", handleKeydown);

    // 启动倒计时
    countdownTimer = window.setInterval(() => {
        countdown.value -= 1;
        if (countdown.value <= 0) {
            showTip.value = false;
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
        }
    }, 1000);
});

onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
});
</script>

<template>
    <div class="fixed inset-0 z-[999999] cursor-crosshair" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
        @mouseup="handleMouseUp">
        <!-- 遮罩层 -->
        <div class="absolute inset-0 bg-black/30" />

        <!-- 选区 -->
        <div v-if="isDrawing && selectionArea.width > 0 && selectionArea.height > 0"
            class="absolute border-2 border-blue-500 bg-blue-500/10" :style="selectionStyle">
            <!-- 尺寸提示 -->
            <div class="absolute -top-8 left-0 rounded bg-blue-500 px-2 py-1 text-xs text-white">
                {{ selectionArea.width }}× {{ selectionArea.height }}
            </div>
        </div>

        <!-- 提示信息 -->
        <div v-if="showTip"
            class="absolute left-1/2 top-8 -translate-x-1/2 rounded-lg bg-white dark:bg-gray-800 px-6 py-3 shadow-lg">
            <p class="text-sm text-gray-700 dark:text-gray-200">
                拖动鼠标选择截图区域，按 ESC 取消
                <span class="ml-2 font-mono text-blue-600 dark:text-blue-400">({{ countdown }}s)</span>
            </p>
        </div>
    </div>
</template>
