import { useEffect, useRef, useState } from "react"

let youtubeApiPromise

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      resolve(window.YT)
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      script.async = true
      document.head.appendChild(script)
    }
  })

  return youtubeApiPromise
}

/**
 * @param {{ title: string, src: string, initialPercent?: number, onProgress: (percent: number) => void | Promise<void> }} props
 */
export function YouTubeProgressPlayer({ title, src, initialPercent = 0, onProgress }) {
  const iframeRef = useRef(null)
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const savedPercentRef = useRef(initialPercent)
  const onProgressRef = useRef(onProgress)
  const [observedPercent, setObservedPercent] = useState(initialPercent)

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    let cancelled = false

    function stopTracking() {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
    }

    async function captureProgress(forceComplete = false) {
      const player = playerRef.current
      const duration = Number(player?.getDuration?.())
      const currentTime = Number(player?.getCurrentTime?.())
      if (!duration || Number.isNaN(currentTime)) return

      const exactPercent = forceComplete ? 100 : Math.min(99, Math.floor((currentTime / duration) * 100))
      setObservedPercent((current) => Math.max(current, exactPercent))

      const checkpoint = forceComplete ? 100 : Math.floor(exactPercent / 10) * 10
      if (checkpoint <= savedPercentRef.current) return
      savedPercentRef.current = checkpoint
      await onProgressRef.current(checkpoint)
    }

    loadYoutubeApi().then((YT) => {
      if (cancelled || !iframeRef.current) return
      playerRef.current = new YT.Player(iframeRef.current, {
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              stopTracking()
              timerRef.current = window.setInterval(() => captureProgress(), 5000)
            } else {
              stopTracking()
              if (event.data === YT.PlayerState.ENDED) captureProgress(true)
              else if (event.data === YT.PlayerState.PAUSED) captureProgress()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      stopTracking()
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  }, [src])

  return (
    <div className="space-y-2">
      <div className="aspect-video overflow-hidden rounded-drive border border-drive-border-soft bg-black">
        <iframe
          ref={iframeRef}
          title={title}
          src={src}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-drive-muted">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-drive-elevated">
          <div className="h-full rounded-full bg-drive-action transition-all" style={{ width: `${observedPercent}%` }} />
        </div>
        <span className="min-w-10 text-right">{observedPercent}%</span>
      </div>
      <p className="text-xs text-drive-muted">Tiến độ được tự động lưu khi bạn xem video.</p>
    </div>
  )
}
