import { useEffect, useMemo, useRef } from "react"

function distance(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function pressureValue(distanceFromCursor, maxDistance, minValue, maxValue) {
  const value = maxValue - Math.abs((maxValue * distanceFromCursor) / maxDistance)
  return Math.max(minValue, value + minValue)
}

/**
 * @param {{ text: string, size?: 'sm' | 'md', className?: string }} props
 */
export function PressureBrandText({ text, size = "md", className = "" }) {
  const titleRef = useRef(null)
  const spansRef = useRef([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const cursorRef = useRef({ x: 0, y: 0 })
  const chars = useMemo(() => text.split(""), [text])

  useEffect(() => {
    function setInitialCursor() {
      if (!titleRef.current) return
      const rect = titleRef.current.getBoundingClientRect()
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      mouseRef.current = center
      cursorRef.current = center
    }

    function handleMouseMove(event) {
      cursorRef.current.x = event.clientX
      cursorRef.current.y = event.clientY
    }

    function handleTouchMove(event) {
      const touch = event.touches[0]
      if (!touch) return
      cursorRef.current.x = touch.clientX
      cursorRef.current.y = touch.clientY
    }

    setInitialCursor()
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("resize", setInitialCursor)

    let frameId = 0
    function animate() {
      mouseRef.current.x += (cursorRef.current.x - mouseRef.current.x) / 14
      mouseRef.current.y += (cursorRef.current.y - mouseRef.current.y) / 14

      if (titleRef.current) {
        const titleRect = titleRef.current.getBoundingClientRect()
        const maxDistance = Math.max(titleRect.width / 1.6, 1)

        spansRef.current.forEach((span) => {
          if (!span) return
          const rect = span.getBoundingClientRect()
          const charCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          }
          const dist = distance(mouseRef.current, charCenter)
          const width = Math.floor(pressureValue(dist, maxDistance, 80, 240))
          const weight = Math.floor(pressureValue(dist, maxDistance, 280, 800))
          const italic = pressureValue(dist, maxDistance, 0, 1).toFixed(2)
          span.style.fontVariationSettings = `'wght' ${weight}, 'wdth' ${width}, 'ital' ${italic}`
        })
      }

      frameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("resize", setInitialCursor)
    }
  }, [])

  return (
    <span
      ref={titleRef}
      className={`pressure-brand pressure-brand--${size} ${className}`}
      aria-label={text}
    >
      {chars.map((char, index) => (
        <span
          aria-hidden="true"
          className="pressure-brand__char"
          key={`${char}-${index}`}
          ref={(element) => {
            spansRef.current[index] = element
          }}
        >
          {char}
        </span>
      ))}
    </span>
  )
}
