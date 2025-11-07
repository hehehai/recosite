<script setup lang="ts">
  import { ref, watch } from "vue";
  import {
    useVideoMetadata,
    type VideoMetadata,
  } from "@/composables/useVideoMetadata";

  const props = defineProps<{
    show: boolean;
    dataUrl: string;
  }>();

  const emit = defineEmits<{
    close: [];
  }>();

  const { metadata, loading, error, extractMetadata } = useVideoMetadata();
  const activeTab = ref<"overview" | "tracks" | "tags">("overview");

  watch(
    () => props.show,
    (show) => {
      if (show && props.dataUrl) {
        extractMetadata(props.dataUrl).catch(console.error);
      }
    },
    { immediate: true }
  );

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  };

  const formatBitrate = (bps: number) => {
    if (bps >= 1_000_000) {
      return `${(bps / 1_000_000).toFixed(2)} Mbps`;
    }
    if (bps >= 1000) {
      return `${(bps / 1000).toFixed(2)} Kbps`;
    }
    return `${bps} bps`;
  };

  const handleClose = () => {
    emit("close");
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click="handleBackdropClick"
      >
        <div
          class="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
          @click.stop
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700"
          >
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              视频详情
            </h2>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              @click="handleClose"
            >
              <svg
                class="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="border-b border-gray-200 dark:border-gray-700">
            <nav class="flex gap-4 px-6">
              <button
                type="button"
                class="border-b-2 px-1 py-3 text-sm font-medium transition"
                :class="activeTab === 'overview'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
                @click="activeTab = 'overview'"
              >
                概览
              </button>
              <button
                type="button"
                class="border-b-2 px-1 py-3 text-sm font-medium transition"
                :class="activeTab === 'tracks'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
                @click="activeTab = 'tracks'"
              >
                轨道信息
              </button>
              <button
                type="button"
                class="border-b-2 px-1 py-3 text-sm font-medium transition"
                :class="activeTab === 'tags'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
                @click="activeTab = 'tags'"
              >
                元数据标签
              </button>
            </nav>
          </div>

          <!-- Content -->
          <div
            class="overflow-y-auto p-6"
            style="max-height: calc(90vh - 180px)"
          >
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
              <div class="text-center">
                <div
                  class="mx-auto size-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                />
                <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  加载元数据...
                </p>
              </div>
            </div>

            <!-- Error State -->
            <div
              v-else-if="error"
              class="flex items-center justify-center py-12"
            >
              <div class="text-center">
                <svg
                  class="mx-auto size-12 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p class="mt-4 text-sm text-red-600 dark:text-red-400">
                  {{ error }}
                </p>
              </div>
            </div>

            <!-- Overview Tab -->
            <div
              v-else-if="activeTab === 'overview' && metadata"
              class="space-y-4"
            >
              <div class="grid grid-cols-2 gap-4">
                <div
                  class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                >
                  <p
                    class="text-sm font-medium text-gray-500 dark:text-gray-400"
                  >
                    格式
                  </p>
                  <p
                    class="mt-1 text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {{
                                            metadata.format }}
                  </p>
                </div>
                <div
                  class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                >
                  <p
                    class="text-sm font-medium text-gray-500 dark:text-gray-400"
                  >
                    MIME 类型
                  </p>
                  <p
                    class="mt-1 text-lg font-mono text-gray-900 dark:text-white"
                  >
                    {{ metadata.mimeType
                                        }}
                  </p>
                </div>
                <div
                  class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                >
                  <p
                    class="text-sm font-medium text-gray-500 dark:text-gray-400"
                  >
                    时长
                  </p>
                  <p
                    class="mt-1 text-lg font-mono font-semibold text-gray-900 dark:text-white"
                  >
                    {{
                                            formatDuration(metadata.duration) }}
                  </p>
                </div>
                <div
                  class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                >
                  <p
                    class="text-sm font-medium text-gray-500 dark:text-gray-400"
                  >
                    轨道数
                  </p>
                  <p
                    class="mt-1 text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {{
                                            metadata.tracks.length }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Tracks Tab -->
            <div
              v-else-if="activeTab === 'tracks' && metadata"
              class="space-y-4"
            >
              <div
                v-for="(track, index) in metadata.tracks"
                :key="index"
                class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div class="mb-3 flex items-center gap-2">
                  <span
                    class="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white"
                  >
                    轨道 {{ index + 1 }}
                  </span>
                  <span
                    class="rounded bg-gray-200 px-2 py-1 text-xs font-medium uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {{ track.type }}
                  </span>
                </div>

                <dl class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      编解码器
                    </dt>
                    <dd class="mt-1 font-mono text-gray-900 dark:text-white">
                      {{ track.codec || '未知' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      完整编解码器字符串
                    </dt>
                    <dd
                      class="mt-1 font-mono text-xs text-gray-900 dark:text-white"
                    >
                      {{
                                                track.codecString }}
                    </dd>
                  </div>
                  <div>
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      时长
                    </dt>
                    <dd class="mt-1 font-mono text-gray-900 dark:text-white">
                      {{
                                                formatDuration(track.duration) }}
                    </dd>
                  </div>

                  <!-- Video Track Specific -->
                  <template v-if="track.codedWidth && track.codedHeight">
                    <div>
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        分辨率
                      </dt>
                      <dd class="mt-1 font-mono text-gray-900 dark:text-white">
                        {{ track.codedWidth
                                                }}
                        × {{ track.codedHeight }}
                      </dd>
                    </div>
                    <div v-if="track.rotation">
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        旋转
                      </dt>
                      <dd class="mt-1 text-gray-900 dark:text-white">
                        {{ track.rotation }}° 顺时针
                      </dd>
                    </div>
                  </template>

                  <!-- Audio Track Specific -->
                  <template v-if="track.numberOfChannels">
                    <div>
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        声道数
                      </dt>
                      <dd class="mt-1 text-gray-900 dark:text-white">
                        {{ track.numberOfChannels }}
                      </dd>
                    </div>
                    <div v-if="track.sampleRate">
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        采样率
                      </dt>
                      <dd class="mt-1 font-mono text-gray-900 dark:text-white">
                        {{ track.sampleRate
                                                }}
                        Hz
                      </dd>
                    </div>
                  </template>

                  <!-- Packet Statistics -->
                  <template v-if="track.packetStats">
                    <div>
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        数据包数量
                      </dt>
                      <dd class="mt-1 text-gray-900 dark:text-white">
                        {{
                                                    track.packetStats.packetCount }}
                      </dd>
                    </div>
                    <div>
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        平均码率
                      </dt>
                      <dd class="mt-1 font-mono text-gray-900 dark:text-white">
                        {{
                                                    formatBitrate(track.packetStats.averageBitrate) }}
                      </dd>
                    </div>
                    <div>
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        平均帧率
                      </dt>
                      <dd class="mt-1 font-mono text-gray-900 dark:text-white">
                        {{
                                                    track.packetStats.averagePacketRate.toFixed(2) }}
                        {{ track.type ===
                                                    'video' ? 'FPS' : 'Hz' }}
                      </dd>
                    </div>
                  </template>

                  <!-- Color Space -->
                  <template v-if="track.colorSpace">
                    <div class="col-span-2">
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        色彩空间
                      </dt>
                      <dd class="mt-1 space-y-1 text-gray-900 dark:text-white">
                        <p>
                          <span class="text-gray-500 dark:text-gray-400"
                            >色域:</span
                          >
                          {{
                                                        track.colorSpace.primaries || '未知' }}
                        </p>
                        <p>
                          <span class="text-gray-500 dark:text-gray-400"
                            >传输特性:</span
                          >
                          {{
                                                        track.colorSpace.transfer || '未知' }}
                        </p>
                        <p>
                          <span class="text-gray-500 dark:text-gray-400"
                            >矩阵系数:</span
                          >
                          {{
                                                        track.colorSpace.matrix || '未知' }}
                        </p>
                        <p>
                          <span class="text-gray-500 dark:text-gray-400"
                            >全范围:</span
                          >
                          {{
                                                        track.colorSpace.fullRange ? '是' : '否' }}
                        </p>
                      </dd>
                    </div>
                    <div v-if="track.hasHDR">
                      <dt class="font-medium text-gray-500 dark:text-gray-400">
                        HDR
                      </dt>
                      <dd class="mt-1">
                        <span
                          class="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        >
                          支持 HDR
                        </span>
                      </dd>
                    </div>
                  </template>
                </dl>
              </div>
            </div>

            <!-- Tags Tab -->
            <div v-else-if="activeTab === 'tags' && metadata" class="space-y-4">
              <div
                v-if="metadata.tags && Object.keys(metadata.tags).length > 0"
                class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <dl class="grid grid-cols-2 gap-4 text-sm">
                  <div v-if="metadata.tags.title">
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      标题
                    </dt>
                    <dd class="mt-1 text-gray-900 dark:text-white">
                      {{ metadata.tags.title }}
                    </dd>
                  </div>
                  <div v-if="metadata.tags.artist">
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      艺术家
                    </dt>
                    <dd class="mt-1 text-gray-900 dark:text-white">
                      {{ metadata.tags.artist }}
                    </dd>
                  </div>
                  <div v-if="metadata.tags.album">
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      专辑
                    </dt>
                    <dd class="mt-1 text-gray-900 dark:text-white">
                      {{ metadata.tags.album }}
                    </dd>
                  </div>
                  <div v-if="metadata.tags.date">
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      日期
                    </dt>
                    <dd class="mt-1 font-mono text-gray-900 dark:text-white">
                      {{
                                                metadata.tags.date.toLocaleDateString() }}
                    </dd>
                  </div>
                  <div v-if="metadata.tags.genre">
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      流派
                    </dt>
                    <dd class="mt-1 text-gray-900 dark:text-white">
                      {{ metadata.tags.genre }}
                    </dd>
                  </div>
                  <div v-if="metadata.tags.comment" class="col-span-2">
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      备注
                    </dt>
                    <dd class="mt-1 text-gray-900 dark:text-white">
                      {{ metadata.tags.comment }}
                    </dd>
                  </div>
                  <div v-if="metadata.tags.description" class="col-span-2">
                    <dt class="font-medium text-gray-500 dark:text-gray-400">
                      描述
                    </dt>
                    <dd class="mt-1 text-gray-900 dark:text-white">
                      {{ metadata.tags.description }}
                    </dd>
                  </div>
                </dl>
              </div>
              <div
                v-else
                class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
              >
                <svg
                  class="size-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <p class="mt-4 text-sm">未找到元数据标签</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <button
              type="button"
              class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600"
              @click="handleClose"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
