export {}

declare global {
  namespace YT {
    interface PlayerOptions {
      videoId: string
      events?: {
        onReady?: () => void
      }
    }

    class Player {
      constructor(elementId: string | HTMLElement, options: PlayerOptions)
      seekTo(seconds: number, allowSeekAhead: boolean): void
      playVideo(): void
    }
  }

  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
  }
}
