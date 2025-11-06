import { ref } from "vue";

export interface VideoMetadata {
  format: string;
  mimeType: string;
  duration: number;
  tracks: VideoTrack[];
  tags?: MetadataTags;
}

export interface VideoTrack {
  type: string;
  codec: string | null;
  codecString: string | null;
  duration: number;
  languageCode?: string;
  // Video specific
  codedWidth?: number;
  codedHeight?: number;
  rotation?: number;
  canBeTransparent?: boolean;
  packetStats?: PacketStats;
  colorSpace?: ColorSpace;
  hasHDR?: boolean;
  // Audio specific
  numberOfChannels?: number;
  sampleRate?: number;
}

export interface PacketStats {
  packetCount: number;
  averagePacketRate: number;
  averageBitrate: number;
}

export interface ColorSpace {
  primaries?: string | null;
  transfer?: string | null;
  matrix?: string | null;
  fullRange?: boolean | null;
}

export interface MetadataTags {
  title?: string;
  description?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  trackNumber?: number;
  date?: Date;
  comment?: string;
  genre?: string;
}

export function useVideoMetadata() {
  const metadata = ref<VideoMetadata | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function extractMetadata(dataUrl: string) {
    loading.value = true;
    error.value = null;

    try {
      const { Input, BlobSource, ALL_FORMATS } = await import("mediabunny");

      // 将 dataURL 转换为 Blob
      const blob = await fetch(dataUrl).then((res) => res.blob());

      // 创建 Input
      const input = new Input({
        source: new BlobSource(blob),
        formats: ALL_FORMATS,
      });

      // 提取元数据
      const [format, mimeType, duration, tracks, tags] = await Promise.all([
        input.getFormat().then((f) => f.name),
        input.getMimeType(),
        input.computeDuration(),
        input.getTracks(),
        input.getMetadataTags(),
      ]);

      // 处理每个轨道的详细信息
      const processedTracks: VideoTrack[] = await Promise.all(
        tracks.map(async (track) => {
          const baseInfo = {
            type: track.type,
            codec: track.codec,
            codecString: await track.getCodecParameterString(),
            duration: await track.computeDuration(),
            languageCode: track.languageCode,
          };

          if (track.isVideoTrack()) {
            const [packetStats, colorSpace] = await Promise.all([
              track.computePacketStats(),
              track.getColorSpace(),
            ]);

            return {
              ...baseInfo,
              codedWidth: track.codedWidth,
              codedHeight: track.codedHeight,
              rotation: track.rotation,
              canBeTransparent: await track.canBeTransparent(),
              hasHDR: await track.hasHighDynamicRange(),
              packetStats: {
                packetCount: packetStats.packetCount,
                averagePacketRate: packetStats.averagePacketRate,
                averageBitrate: packetStats.averageBitrate,
              },
              colorSpace: {
                primaries: colorSpace.primaries,
                transfer: colorSpace.transfer,
                matrix: colorSpace.matrix,
                fullRange: colorSpace.fullRange,
              },
            };
          }

          if (track.isAudioTrack()) {
            const packetStats = await track.computePacketStats();
            return {
              ...baseInfo,
              numberOfChannels: track.numberOfChannels,
              sampleRate: track.sampleRate,
              packetStats: {
                packetCount: packetStats.packetCount,
                averagePacketRate: packetStats.averagePacketRate,
                averageBitrate: packetStats.averageBitrate,
              },
            };
          }

          return baseInfo;
        })
      );

      metadata.value = {
        format,
        mimeType,
        duration,
        tracks: processedTracks,
        tags: {
          title: tags.title,
          description: tags.description,
          artist: tags.artist,
          album: tags.album,
          albumArtist: tags.albumArtist,
          trackNumber: tags.trackNumber,
          date: tags.date,
          comment: tags.comment,
        },
      };

      loading.value = false;
    } catch (err) {
      error.value = String(err);
      loading.value = false;
    }
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  return {
    metadata,
    loading,
    error,
    extractMetadata,
    formatDuration,
  };
}
