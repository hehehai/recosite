<script setup lang="ts">
import { ref } from "vue";
import { browser } from "wxt/browser";
import Toast from "@/components/Toast.vue";
import { useToast } from "@/composables/useToast";
import { ImageFormat, MessageType } from "@/types/screenshot";

const { error } = useToast();
const isCapturing = ref(false);
const lastResult = ref<{
    fileName: string;
    width: number;
    height: number;
} | null>(null);

async function captureViewport(format: ImageFormat = ImageFormat.PNG) {
    try {
        isCapturing.value = true;
        lastResult.value = null;

        const response = await browser.runtime.sendMessage({
            type: MessageType.CAPTURE_VIEWPORT,
            data: { format, quality: 0.92 },
        });

        if (response.error) {
            error(`截图失败: ${response.error}`);
            return;
        }

        lastResult.value = {
            fileName: response.fileName,
            width: response.width,
            height: response.height,
        };
    } catch (err) {
        error(`截图失败: ${err}`);
    } finally {
        isCapturing.value = false;
    }
}

async function captureFullPage(format: ImageFormat = ImageFormat.PNG) {
    try {
        isCapturing.value = true;
        lastResult.value = null;

        const response = await browser.runtime.sendMessage({
            type: MessageType.CAPTURE_FULL_PAGE,
            data: { format, quality: 0.92 },
        });

        if (response.error) {
            error(`长截图失败: ${response.error}`);
            return;
        }

        lastResult.value = {
            fileName: response.fileName,
            width: response.width,
            height: response.height,
        };
    } catch (err) {
        error(`长截图失败: ${err}`);
    } finally {
        isCapturing.value = false;
    }
}

async function captureSelection(format: ImageFormat = ImageFormat.PNG) {
    try {
        isCapturing.value = true;
        lastResult.value = null;

        const response = await browser.runtime.sendMessage({
            type: MessageType.START_SELECTION,
            data: { format, quality: 0.92 },
        });

        if (response.cancelled) {
            isCapturing.value = false;
            return;
        }

        if (response.error) {
            error(`选区截图失败: ${response.error}`);
            return;
        }

        lastResult.value = {
            fileName: response.fileName,
            width: response.width,
            height: response.height,
        };
    } catch (err) {
        error(`选区截图失败: ${err}`);
    } finally {
        isCapturing.value = false;
    }
}
</script>

<template>
    <Toast />
    <div class="w-80 p-4 bg-white dark:bg-gray-900">
        <!-- 标题 -->
        <div class="mb-6 text-center">
            <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">
                Recosite
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">网页截图与录屏工具</p>
        </div>

        <!-- 截图功能区 -->
        <div class="space-y-3">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                📸 截图功能
            </h2>

            <!-- 视窗截图 -->
            <div class="space-y-2">
                <button type="button"
                    class="w-full rounded-lg bg-blue-500 dark:bg-blue-600 px-4 py-3 text-left text-white transition hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
                    :disabled="isCapturing" @click="captureViewport(ImageFormat.PNG)">
                    <div class="font-medium">视窗截图 (PNG)</div>
                    <div class="text-xs opacity-90">截取当前可见区域</div>
                </button>

                <button type="button"
                    class="w-full rounded-lg bg-blue-500 dark:bg-blue-600 px-4 py-3 text-left text-white transition hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
                    :disabled="isCapturing" @click="captureViewport(ImageFormat.JPEG)">
                    <div class="font-medium">视窗截图 (JPEG)</div>
                    <div class="text-xs opacity-90">截取当前可见区域</div>
                </button>
            </div>

            <!-- 长截图 -->
            <div class="space-y-2">
                <button type="button"
                    class="w-full rounded-lg bg-green-500 dark:bg-green-600 px-4 py-3 text-left text-white transition hover:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50"
                    :disabled="isCapturing" @click="captureFullPage(ImageFormat.PNG)">
                    <div class="font-medium">长截图 (PNG)</div>
                    <div class="text-xs opacity-90">截取整个网页</div>
                </button>

                <button type="button"
                    class="w-full rounded-lg bg-green-500 dark:bg-green-600 px-4 py-3 text-left text-white transition hover:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50"
                    :disabled="isCapturing" @click="captureFullPage(ImageFormat.JPEG)">
                    <div class="font-medium">长截图 (JPEG)</div>
                    <div class="text-xs opacity-90">截取整个网页</div>
                </button>
            </div>

            <!-- 局部截图 -->
            <div class="space-y-2">
                <button type="button"
                    class="w-full rounded-lg bg-purple-500 dark:bg-purple-600 px-4 py-3 text-left text-white transition hover:bg-purple-600 dark:hover:bg-purple-700 disabled:opacity-50"
                    :disabled="isCapturing" @click="captureSelection(ImageFormat.PNG)">
                    <div class="font-medium">选区截图 (PNG)</div>
                    <div class="text-xs opacity-90">拖动选择截图区域</div>
                </button>

                <button type="button"
                    class="w-full rounded-lg bg-purple-500 dark:bg-purple-600 px-4 py-3 text-left text-white transition hover:bg-purple-600 dark:hover:bg-purple-700 disabled:opacity-50"
                    :disabled="isCapturing" @click="captureSelection(ImageFormat.JPEG)">
                    <div class="font-medium">选区截图 (JPEG)</div>
                    <div class="text-xs opacity-90">拖动选择截图区域</div>
                </button>
            </div>
        </div>

        <!-- 状态提示 -->
        <div v-if="isCapturing" class="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3 text-center">
            <div class="text-sm text-blue-700 dark:text-blue-300">截图中...</div>
        </div>

        <!-- 结果显示 -->
        <div v-if="lastResult" class="mt-4 rounded-lg bg-green-50 dark:bg-green-900/30 p-3">
            <div class="text-sm text-green-700 dark:text-green-300">
                <div class="font-medium">截图成功！</div>
                <div class="mt-1 text-xs">
                    文件: {{ lastResult.fileName }}
                    <br>
                    尺寸: {{ lastResult.width }}× {{ lastResult.height }}
                </div>
            </div>
        </div>

        <!-- 录屏功能区（待实现） -->
        <div class="mt-6 space-y-3">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                🎥 录屏功能
            </h2>
            <div
                class="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                即将推出...
            </div>
        </div>
    </div>
</template>
