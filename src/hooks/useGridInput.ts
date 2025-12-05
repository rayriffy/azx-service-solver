import { useRef, useCallback, useEffect } from 'react'

export const useGridInput = (gridHeight: number, gridWidth: number) => {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const setInputRef = useCallback((row: number, col: number, el: HTMLInputElement | null) => {
    const key = `${row}-${col}`
    if (el) {
      inputRefs.current.set(key, el)
    } else {
      inputRefs.current.delete(key)
    }
  }, [])

  const focusCell = useCallback((row: number, col: number) => {
    const key = `${row}-${col}`
    const input = inputRefs.current.get(key)
    if (input) {
      input.focus()
      input.select()
    }
  }, [])

  const focusNextCell = useCallback((currentRow: number, currentCol: number) => {
    const nextCol = currentCol + 1
    if (nextCol < gridWidth) {
      // Move to next column in same row
      focusCell(currentRow, nextCol)
    } else {
      // Row is filled, move to first column of next row
      const nextRow = currentRow + 1
      if (nextRow < gridHeight) {
        focusCell(nextRow, 0)
      }
    }
  }, [gridWidth, gridHeight, focusCell])

  // Focus first cell when grid dimensions change
  useEffect(() => {
    const timer = setTimeout(() => {
      focusCell(0, 0)
    }, 100)
    return () => clearTimeout(timer)
  }, [gridHeight, gridWidth, focusCell])

  return {
    setInputRef,
    focusCell,
    focusNextCell,
  }
}
