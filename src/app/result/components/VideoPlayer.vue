<script setup lang="ts">
import {
  ALL_FORMATS,
  AudioBufferSink,
  BlobSource,
  CanvasSink,
  Input,
  type WrappedAudioBuffer,
  type WrappedCanvas,
} from "mediabunny";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { t } from "@/lib/i18n";

const props = defineProps<{
  dataUrl: string;
  targetWidth?: number;
  targetHeight?: number;
  originalWidth?: number;
  originalHeight?: number;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const playerContainer = ref<HTMLDivElement | null>(null);
const controlsElement = ref<HTMLDivElement | null>(null);

const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.7);
const volumeMuted = ref(false);
const loading = ref(false);
const error = ref("");
const hasVideo = ref(false);
const hasAudio = ref(false);
const draggingProgress = ref(false);
const draggingVolume = ref(false);

let context: CanvasRenderingContext2D | null = null;
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let videoSink: CanvasSink | null = null;
let audioSink: AudioBufferSink | null = null;
let totalDuration = 0;
let audioContextStartTime: number | null = null;
let playbackTimeAtStart = 0;
let videoFrameIterator: AsyncGenerator<WrappedCanvas, void, unknown> | null =
  null;
let audioBufferIterator: AsyncGenerator<
  WrappedAudioBuffer,
  void,
  unknown
> | null = null;
let nextFrame: WrappedCanvas | null = null;
const queuedAudioNodes: Set<AudioBufferSourceNode> = new Set();
let asyncId = 0;
let hideControlsTimeout = -1;
let animationFrameId = -1;

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

const getPlaybackTime = () => {
  if (playing.value && audioContext && audioContextStartTime !== null) {
    return (
      audioContext.currentTime - audioContextStartTime + playbackTimeAtStart
    );
  }
  return playbackTimeAtStart;
};

const updateVolume = () => {
  if (!gainNode) {
    return;
  }

  const actualVolume = volumeMuted.value ? 0 : volume.value;
  gainNode.gain.value = actualVolume ** 2;
};

const startVideoIterator = async () => {
  if (!videoSink) {
    return;
  }

  asyncId += 1;
  await videoFrameIterator?.return();

  videoFrameIterator = videoSink.canvases(getPlaybackTime());

  const firstFrame = (await videoFrameIterator.next()).value ?? null;
  const secondFrame = (await videoFrameIterator.next()).value ?? null;

  nextFrame = secondFrame;

  if (firstFrame && context && canvas.value) {
    context.clearRect(0, 0, canvas.value.width, canvas.value.height);
    context.drawImage(firstFrame.canvas, 0, 0);
  } else {
    console.warn(
      "[VideoPlayer] Cannot draw first frame - firstFrame:",
      !!firstFrame,
      "context:",
      !!context,
      "canvas:",
      !!canvas.value
    );
  }
};

const updateNextFrame = async () => {
  const currentAsyncId = asyncId;

  while (true) {
    const newNextFrame = (await videoFrameIterator!.next()).value ?? null;
    if (!newNextFrame) {
      break;
    }
    if (currentAsyncId !== asyncId) {
      break;
    }

    const playbackTime = getPlaybackTime();
    if (newNextFrame.timestamp <= playbackTime) {
      if (context && canvas.value) {
        context.clearRect(0, 0, canvas.value.width, canvas.value.height);
        context.drawImage(newNextFrame.canvas, 0, 0);
      }
    } else {
      nextFrame = newNextFrame;
      break;
    }
  }
};

const render = () => {
  const playbackTime = getPlaybackTime();

  if (playbackTime >= totalDuration && playing.value) {
    pause();
    playbackTimeAtStart = totalDuration;
  }

  if (nextFrame && nextFrame.timestamp <= playbackTime) {
    if (context && canvas.value) {
      context.clearRect(0, 0, canvas.value.width, canvas.value.height);
      context.drawImage(nextFrame.canvas, 0, 0);
    }
    nextFrame = null;
    updateNextFrame().catch(console.error);
  }

  if (!draggingProgress.value) {
    currentTime.value = playbackTime;
  }

  if (playing.value) {
    animationFrameId = requestAnimationFrame(render);
  }
};

const runAudioIterator = async () => {
  if (!(audioSink && audioContext && gainNode)) {
    return;
  }

  for await (const { buffer, timestamp } of audioBufferIterator!) {
    const node = audioContext.createBufferSource();
    node.buffer = buffer;
    node.connect(gainNode);

    const startTimestamp =
      audioContextStartTime! + timestamp - playbackTimeAtStart;

    if (startTimestamp >= audioContext.currentTime) {
      node.start(startTimestamp);
    } else {
      node.start(
        audioContext.currentTime,
        audioContext.currentTime - startTimestamp
      );
    }

    queuedAudioNodes.add(node);
    node.onended = () => {
      queuedAudioNodes.delete(node);
    };

    if (timestamp - getPlaybackTime() >= 1) {
      await new Promise<void>((resolve) => {
        const id = setInterval(() => {
          if (timestamp - getPlaybackTime() < 1) {
            clearInterval(id);
            resolve();
          }
        }, 100);
      });
    }
  }
};

const play = async () => {
  if (!audioContext) {
    return;
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  if (getPlaybackTime() === totalDuration) {
    playbackTimeAtStart = 0;
    await startVideoIterator();
  }

  audioContextStartTime = audioContext.currentTime;
  playing.value = true;

  if (audioSink) {
    audioBufferIterator?.return().catch(console.error);
    audioBufferIterator = audioSink.buffers(getPlaybackTime());
    runAudioIterator().catch(console.error);
  }

  render();
};

const pause = () => {
  playbackTimeAtStart = getPlaybackTime();
  playing.value = false;

  audioBufferIterator?.return().catch(console.error);
  audioBufferIterator = null;

  for (const node of queuedAudioNodes) {
    node.stop();
  }
  queuedAudioNodes.clear();

  if (animationFrameId !== -1) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = -1;
  }
};

const togglePlay = () => {
  if (playing.value) {
    pause();
  } else {
    play().catch(console.error);
  }
};

const seekToTime = async (seconds: number) => {
  const wasPlaying = playing.value;

  if (wasPlaying) {
    pause();
  }

  playbackTimeAtStart = seconds;
  currentTime.value = seconds;

  await startVideoIterator();

  if (wasPlaying && playbackTimeAtStart < totalDuration) {
    play().catch(console.error);
  }
};

const handleProgressClick = (event: PointerEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const completion = Math.max(
    Math.min((event.clientX - rect.left) / rect.width, 1),
    0
  );
  seekToTime(completion * totalDuration).catch(console.error);
};

const handleProgressDragStart = (event: PointerEvent) => {
  draggingProgress.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const completion = Math.max(
    Math.min((event.clientX - rect.left) / rect.width, 1),
    0
  );
  currentTime.value = completion * totalDuration;
};

const handleProgressDragMove = (event: PointerEvent) => {
  if (!draggingProgress.value) {
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const completion = Math.max(
    Math.min((event.clientX - rect.left) / rect.width, 1),
    0
  );
  currentTime.value = completion * totalDuration;
};

const handleProgressDragEnd = (event: PointerEvent) => {
  if (!draggingProgress.value) {
    return;
  }

  draggingProgress.value = false;
  (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const completion = Math.max(
    Math.min((event.clientX - rect.left) / rect.width, 1),
    0
  );
  seekToTime(completion * totalDuration).catch(console.error);
};

const handleVolumeDragStart = (event: PointerEvent) => {
  draggingVolume.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  volume.value = Math.max(
    Math.min((event.clientX - rect.left) / rect.width, 1),
    0
  );
  volumeMuted.value = false;
  updateVolume();
};

const handleVolumeDragMove = (event: PointerEvent) => {
  if (!draggingVolume.value) {
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  volume.value = Math.max(
    Math.min((event.clientX - rect.left) / rect.width, 1),
    0
  );
  updateVolume();
};

const handleVolumeDragEnd = (event: PointerEvent) => {
  if (!draggingVolume.value) {
    return;
  }

  draggingVolume.value = false;
  (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
};

const toggleMute = () => {
  volumeMuted.value = !volumeMuted.value;
  updateVolume();
};

const showControlsTemporarily = () => {
  if (!hasVideo.value) {
    return;
  }

  if (controlsElement.value) {
    controlsElement.value.style.opacity = "1";
    controlsElement.value.style.pointerEvents = "";
  }

  if (playerContainer.value) {
    playerContainer.value.style.cursor = "";
  }

  clearTimeout(hideControlsTimeout);
  hideControlsTimeout = window.setTimeout(() => {
    if (draggingProgress.value) {
      return;
    }

    if (controlsElement.value) {
      controlsElement.value.style.opacity = "0";
      controlsElement.value.style.pointerEvents = "none";
    }

    if (playerContainer.value) {
      playerContainer.value.style.cursor = "none";
    }
  }, 2000);
};

const handlePlayerClick = () => {
  togglePlay();
};

const handlePlayerMouseMove = () => {
  showControlsTemporarily();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === "Space" || e.code === "KeyK") {
    togglePlay();
    e.preventDefault();
  } else if (e.code === "ArrowLeft") {
    seekToTime(Math.max(getPlaybackTime() - 5, 0)).catch(console.error);
    e.preventDefault();
  } else if (e.code === "ArrowRight") {
    seekToTime(Math.min(getPlaybackTime() + 5, totalDuration)).catch(
      console.error
    );
    e.preventDefault();
  } else if (e.code === "KeyM") {
    toggleMute();
    e.preventDefault();
  }
};

const initPlayer = async () => {
  try {
    loading.value = true;
    error.value = "";

    const blob = await fetch(props.dataUrl).then((res) => res.blob());
    const source = new BlobSource(blob);
    const input = new Input({ source, formats: ALL_FORMATS });

    totalDuration = await input.computeDuration();
    duration.value = totalDuration;

    let videoTrack = await input.getPrimaryVideoTrack();
    let audioTrack = await input.getPrimaryAudioTrack();

    if (videoTrack) {
      const canDecode = await videoTrack.canDecode();
      if (videoTrack.codec === null || !canDecode) {
        console.warn("[VideoPlayer] Video track cannot be decoded");
        videoTrack = null;
      }
    }

    if (audioTrack) {
      const canDecode = await audioTrack.canDecode();
      if (audioTrack.codec === null || !canDecode) {
        console.warn("[VideoPlayer] Audio track cannot be decoded");
        audioTrack = null;
      }
    }

    if (!(videoTrack || audioTrack)) {
      throw new Error("No playable audio or video track found");
    }

    hasVideo.value = !!videoTrack;
    hasAudio.value = !!audioTrack;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContext({ sampleRate: audioTrack?.sampleRate });
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    updateVolume();

    if (videoTrack && canvas.value) {
      const videoCanBeTransparent = await videoTrack.canBeTransparent();

      // 使用目标尺寸或原始尺寸
      const canvasWidth = props.targetWidth || videoTrack.displayWidth;
      const canvasHeight = props.targetHeight || videoTrack.displayHeight;

      console.log("[VideoPlayer] Canvas dimensions:", {
        canvasWidth,
        canvasHeight,
        targetWidth: props.targetWidth,
        targetHeight: props.targetHeight,
        displayWidth: videoTrack.displayWidth,
        displayHeight: videoTrack.displayHeight,
      });

      videoSink = new CanvasSink(videoTrack, {
        poolSize: 2,
        fit: "contain",
        alpha: videoCanBeTransparent,
        width: canvasWidth,
        height: canvasHeight,
      });

      canvas.value.width = canvasWidth;
      canvas.value.height = canvasHeight;
      context = canvas.value.getContext("2d");

      // 设置画布样式以确保正确的宽高比
      if (props.originalWidth && props.originalHeight) {
        const aspectRatio = props.originalWidth / props.originalHeight;
        canvas.value.style.aspectRatio = aspectRatio.toString();
      }
    }

    if (audioTrack) {
      audioSink = new AudioBufferSink(audioTrack);
    }

    await startVideoIterator();

    // 确保第一帧被渲染
    if (context && canvas.value) {
      render();
    }

    if (audioContext.state === "running") {
      await play();
    }

    loading.value = false;
  } catch (err) {
    console.error(err);
    error.value = String(err);
    loading.value = false;
  }
};

onMounted(() => {
  initPlayer().catch(console.error);
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  pause();
  videoFrameIterator?.return().catch(console.error);
  audioBufferIterator?.return().catch(console.error);
  audioContext?.close();
  window.removeEventListener("keydown", handleKeyDown);
  clearTimeout(hideControlsTimeout);
  if (animationFrameId !== -1) {
    cancelAnimationFrame(animationFrameId);
  }
});

watch(
  () => props.dataUrl,
  () => {
    pause();
    initPlayer().catch(console.error);
  }
);

// 监听尺寸变化
watch(
  [
    () => props.targetWidth,
    () => props.targetHeight,
    () => props.originalWidth,
    () => props.originalHeight,
  ],
  () => {
    if (canvas.value && context && hasVideo.value) {
      // 重新初始化播放器以应用新尺寸
      pause();
      initPlayer().catch(console.error);
    }
  }
);
</script>

<template>
  <div class="relative w-full">
    <!-- Player Container - always rendered -->
    <div
      ref="playerContainer"
      class="relative w-full bg-black rounded-lg overflow-hidden select-none"
      @click="handlePlayerClick"
      @pointermove="handlePlayerMouseMove"
    >
      <canvas
        ref="canvas"
        :class="['w-full h-auto object-contain', hasVideo ? '' : 'hidden']"
        style="display: block; max-height: 100%;"
      />

      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black">
        <p class="text-sm text-gray-400 animate-pulse">
          {{ t("video_loading") }}
        </p>
      </div>

      <!-- Error Overlay -->
      <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-black">
        <p class="text-sm text-red-400">{{ error }}</p>
      </div>

      <div v-if="!hasVideo" class="flex items-center justify-center py-32">
        <div class="text-center">
          <svg
            class="mx-auto size-16 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          <p class="mt-4 text-sm text-gray-400 dark:text-gray-600">
            {{ t("video_audio_only") }}
          </p>
        </div>
      </div>

      <!-- Controls -->
      <div
        ref="controlsElement"
        class="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4 transition-opacity"
        :class="hasVideo ? 'opacity-0' : 'opacity-100'"
        @click.stop
      >
        <!-- Progress Bar -->
        <div
          class="group mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition hover:h-2"
          @pointerdown="handleProgressDragStart"
          @pointermove="handleProgressDragMove"
          @pointerup="handleProgressDragEnd"
        >
          <div
            class="relative h-full rounded-full bg-blue-500 transition-all"
            :style="{ width: `${(currentTime / duration) * 100}%` }"
          >
            <div
              class="absolute right-0 top-1/2 size-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-lg opacity-0 transition group-hover:opacity-100"
            />
          </div>
        </div>

        <!-- Control Buttons -->
        <div class="flex items-center gap-3 text-white">
          <!-- Play/Pause Button -->
          <button
            type="button"
            class="rounded p-1 transition hover:bg-white/10"
            @click="togglePlay"
          >
            <svg v-if="!playing" class="size-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else class="size-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </button>

          <!-- Volume Controls -->
          <div v-if="hasAudio" class="flex items-center gap-2">
            <button
              type="button"
              class="rounded p-1 transition hover:bg-white/10"
              @click="toggleMute"
            >
              <svg
                v-if="volumeMuted || volume === 0"
                class="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
              <svg
                v-else-if="volume < 0.5"
                class="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
              <svg v-else class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            </button>

            <div
              class="group h-1 w-20 cursor-pointer rounded-full bg-white/20 transition hover:h-1.5"
              @pointerdown="handleVolumeDragStart"
              @pointermove="handleVolumeDragMove"
              @pointerup="handleVolumeDragEnd"
            >
              <div
                class="relative h-full rounded-full bg-white transition-all"
                :style="{ width: `${(volumeMuted ? 0 : volume) * 100}%` }"
              >
                <div
                  class="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-lg opacity-0 transition group-hover:opacity-100"
                />
              </div>
            </div>
          </div>

          <!-- Time Display -->
          <div class="flex-1 text-right font-mono text-sm tabular-nums">
            <span>{{ formatTime(currentTime) }}</span>
            <span class="text-white/60"> / </span>
            <span>{{ formatTime(duration) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
