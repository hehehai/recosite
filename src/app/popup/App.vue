<script setup lang="ts">
import { onMounted, ref } from "vue";
import { sendMessage } from "webext-bridge/popup";
import { browser } from "wxt/browser";
import Toast from "@/components/Toast.vue";
import { useToast } from "@/composables/useToast";
import {
    ImageFormat,
    MessageType,
    RecordingState,
    VideoFormat,
} from "@/types/screenshot";

const { error } = useToast();
const isCapturing = ref(false);
const lastResult = ref<{
    fileName: string;
    width: number;
    height: number;
} | null>(null);

// 录制状态
const recordingState = ref<RecordingState>(RecordingState.IDLE);
const lastRecordingResult = ref<{
    fileName: string;
    size: number;
} | null>(null);

// 检查录制状态
async function checkRecordingStatus() {
    try {
        const response = await sendMessage(
            "recording:get-status",
            {},
            "background"
        );
        recordingState.value = response.state;
    } catch (err) {
        console.error("Failed to get recording status:", err);
    }
}

// 页面加载时检查录制状态
onMounted(() => {
    checkRecordingStatus();
});

async function captureViewport() {
    try {
        isCapturing.value = true;
        lastResult.value = null;

        const response = await browser.runtime.sendMessage({
            type: MessageType.CAPTURE_VIEWPORT,
            data: { format: ImageFormat.PNG, quality: 0.92 },
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

async function captureFullPage() {
    try {
        isCapturing.value = true;
        lastResult.value = null;

        const response = await browser.runtime.sendMessage({
            type: MessageType.CAPTURE_FULL_PAGE,
            data: { format: ImageFormat.PNG, quality: 0.92 },
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

async function captureSelection() {
    try {
        isCapturing.value = true;
        lastResult.value = null;

        const response = await browser.runtime.sendMessage({
            type: MessageType.START_SELECTION,
            data: { format: ImageFormat.PNG, quality: 0.92 },
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

async function toggleRecording() {
    try {
        if (recordingState.value === RecordingState.RECORDING) {
            // 停止录制
            recordingState.value = RecordingState.PROCESSING;
            lastRecordingResult.value = null;

            const response = await sendMessage(
                "recording:stop-request",
                {},
                "background"
            );

            if (response.error) {
                error(`停止录制失败: ${response.error}`);
                recordingState.value = RecordingState.IDLE;
                return;
            }

            if (response.fileName && response.size !== undefined) {
                lastRecordingResult.value = {
                    fileName: response.fileName,
                    size: response.size,
                };
            }
            recordingState.value = RecordingState.IDLE;
        } else {
            // 开始录制
            lastRecordingResult.value = null;

            const response = await sendMessage(
                "recording:start-request",
                {
                    format: VideoFormat.WEBM,
                },
                "background"
            );

            if (response.error) {
                error(`开始录制失败: ${response.error}`);
                return;
            }

            // 只有成功时才更新状态
            recordingState.value = RecordingState.RECORDING;
        }
    } catch (err) {
        error(`录制操作失败: ${err}`);
        recordingState.value = RecordingState.IDLE;
    }
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
            <button type="button"
                class="w-full rounded-lg bg-blue-500 dark:bg-blue-600 px-4 py-3 text-left text-white transition hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
                :disabled="isCapturing" @click="captureViewport">
                <div class="font-medium">视窗截图</div>
                <div class="text-xs opacity-90">截取当前可见区域</div>
            </button>

            <!-- 长截图 -->
            <button type="button"
                class="w-full rounded-lg bg-green-500 dark:bg-green-600 px-4 py-3 text-left text-white transition hover:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50"
                :disabled="isCapturing" @click="captureFullPage">
                <div class="font-medium">长截图</div>
                <div class="text-xs opacity-90">截取整个网页</div>
            </button>

            <!-- 局部截图 -->
            <button type="button"
                class="w-full rounded-lg bg-purple-500 dark:bg-purple-600 px-4 py-3 text-left text-white transition hover:bg-purple-600 dark:hover:bg-purple-700 disabled:opacity-50"
                :disabled="isCapturing" @click="captureSelection">
                <div class="font-medium">选区截图</div>
                <div class="text-xs opacity-90">拖动选择截图区域</div>
            </button>
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

        <!-- 录屏功能区 -->
        <div class="mt-6 space-y-3">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                🎥 录屏功能
            </h2>

            <!-- 录制按钮 -->
            <button type="button" :class="[
                'w-full rounded-lg px-4 py-3 text-left text-white transition disabled:opacity-50',
                recordingState === RecordingState.RECORDING
                    ? 'bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700'
                    : 'bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700',
            ]" :disabled="recordingState === RecordingState.PROCESSING || isCapturing" @click="toggleRecording">
                <div class="font-medium">
                    <span v-if="recordingState === RecordingState.IDLE">开始录制</span>
                    <span v-else-if="recordingState === RecordingState.RECORDING">⏺ 停止录制</span>
                    <span v-else>处理中...</span>
                </div>
                <div class="text-xs opacity-90">
                    <span v-if="recordingState === RecordingState.IDLE">录制当前标签页</span>
                    <span v-else-if="recordingState === RecordingState.RECORDING">点击停止并保存</span>
                    <span v-else>正在保存录制文件...</span>
                </div>
            </button>
        </div>

        <!-- 录制状态提示 -->
        <div v-if="recordingState === RecordingState.RECORDING"
            class="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-center">
            <div class="text-sm text-red-700 dark:text-red-300">
                <div class="font-medium">🔴 正在录制中...</div>
                <div class="mt-1 text-xs">再次点击按钮停止录制</div>
            </div>
        </div>

        <div v-if="recordingState === RecordingState.PROCESSING"
            class="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3 text-center">
            <div class="text-sm text-blue-700 dark:text-blue-300">
                处理录制文件中...
            </div>
        </div>

        <!-- 录制结果显示 -->
        <div v-if="lastRecordingResult" class="mt-4 rounded-lg bg-green-50 dark:bg-green-900/30 p-3">
            <div class="text-sm text-green-700 dark:text-green-300">
                <div class="font-medium">录制成功！</div>
                <div class="mt-1 text-xs">
                    文件: {{ lastRecordingResult.fileName }}
                    <br>
                    大小: {{ formatFileSize(lastRecordingResult.size) }}
                </div>
            </div>
        </div>
    </div>
</template>
