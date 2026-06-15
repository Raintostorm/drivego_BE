import { useEffect, useState, useRef } from "react"

/**
 * @param {{
 *   text: string,
 *   speed?: number,
 *   maxIterations?: number,
 *   characters?: string,
 *   className?: string,
 *   parentClassName?: string,
 *   encryptedClassName?: string,
 *   animateOn?: 'view' | 'hover',
 *   sequential?: boolean,
 *   loop?: boolean,
 *   loopDelay?: number
 * }} props
 */
export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+",
  className = "",
  parentClassName = "",
  encryptedClassName = "",
  animateOn = "view",
  sequential = true,
  loop = true,
  loopDelay = 3000,
}) {
  const [displayText, setDisplayText] = useState("")
  const containerRef = useRef(null)
  const timerRef = useRef(null)
  const loopTimerRef = useRef(null)
  const isIntersectingRef = useRef(false)

  const getRandomChar = () => characters[Math.floor(Math.random() * characters.length)]

  const startAnimation = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current)

    const textLength = text.length
    if (textLength === 0) return

    const charStates = Array.from({ length: textLength }, (_, i) => ({
      index: i,
      char: text[i],
      isSpace: text[i] === " ",
      resolved: false,
      currentIterations: 0,
      targetIterations: sequential ? maxIterations : Math.floor(Math.random() * maxIterations) + 1,
    }))

    let currentResolveIndex = 0

    timerRef.current = setInterval(() => {
      // Advance currentResolveIndex over spaces or already resolved elements
      while (
        currentResolveIndex < textLength &&
        (charStates[currentResolveIndex].resolved || charStates[currentResolveIndex].isSpace)
      ) {
        charStates[currentResolveIndex].resolved = true
        currentResolveIndex++
      }

      let allResolved = true

      const newDisplayText = charStates
        .map((state, i) => {
          if (state.isSpace) {
            return " "
          }

          if (state.resolved) {
            return state.char
          }

          allResolved = false

          if (sequential) {
            if (i === currentResolveIndex) {
              state.currentIterations++
              if (state.currentIterations >= state.targetIterations) {
                state.resolved = true
              }
              return getRandomChar()
            } else if (i > currentResolveIndex) {
              return getRandomChar()
            } else {
              state.resolved = true
              return state.char
            }
          } else {
            state.currentIterations++
            if (state.currentIterations >= state.targetIterations) {
              state.resolved = true
            }
            return state.resolved ? state.char : getRandomChar()
          }
        })
        .join("")

      setDisplayText(newDisplayText)

      if (allResolved) {
        clearInterval(timerRef.current)
        timerRef.current = null

        if (loop && isIntersectingRef.current) {
          loopTimerRef.current = setTimeout(() => {
            startAnimation()
          }, loopDelay)
        }
      }
    }, speed)
  }

  useEffect(() => {
    let observer
    if (animateOn === "view") {
      observer = new IntersectionObserver(
        ([entry]) => {
          isIntersectingRef.current = entry.isIntersecting
          if (entry.isIntersecting) {
            startAnimation()
          } else {
            if (timerRef.current) clearInterval(timerRef.current)
            if (loopTimerRef.current) clearTimeout(loopTimerRef.current)
          }
        },
        { threshold: 0.1 }
      )
      if (containerRef.current) {
        observer.observe(containerRef.current)
      }
    } else {
      isIntersectingRef.current = true
      setDisplayText(text)
    }

    return () => {
      if (observer) observer.disconnect()
      if (timerRef.current) clearInterval(timerRef.current)
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current)
    }
  }, [text, speed, maxIterations, sequential, animateOn, loop, loopDelay])

  const handleMouseEnter = () => {
    if (animateOn === "hover") {
      startAnimation()
    }
  }

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      className={parentClassName}
      style={{ display: "inline-block", whiteSpace: "pre-wrap" }}
    >
      {displayText.split("").map((char, index) => {
        const isOriginal = char === text[index]
        const cls = isOriginal ? className : encryptedClassName
        if (!cls) return char
        return (
          <span key={index} className={cls}>
            {char}
          </span>
        )
      })}
    </span>
  )
}
