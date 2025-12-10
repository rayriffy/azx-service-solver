import { useEffect } from 'react'

interface UseKeyboardNavigationOptions {
  enabled: boolean
  maxStep: number
  onNext: () => void
  onPrev: () => void
}

export const useKeyboardNavigation = ({
  enabled,
  maxStep,
  onNext,
  onPrev,
}: UseKeyboardNavigationOptions) => {
  useEffect(() => {
    if (!enabled || maxStep === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement) return
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        onNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        onPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, maxStep, onNext, onPrev])
}


