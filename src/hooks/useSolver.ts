import { useState, useCallback, useMemo } from 'react'
import type { Step } from '../types'
import { solvePuzzle } from '../lib/solver'
import { createEmptyGrid } from '../lib/utils'

const DEFAULT_WIDTH = 8
const DEFAULT_HEIGHT = 14

export const useSolver = () => {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [grid, setGrid] = useState<number[][]>(() => 
    createEmptyGrid(DEFAULT_HEIGHT, DEFAULT_WIDTH)
  )
  const [solution, setSolution] = useState<Step[] | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const initializeGrid = useCallback(() => {
    setGrid(createEmptyGrid(height, width))
    setSolution(null)
    setCurrentStep(0)
  }, [width, height])

  const updateCell = useCallback((row: number, col: number, value: number) => {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      newGrid[row][col] = Math.min(9, Math.max(0, value))
      return newGrid
    })
    setSolution(null)
  }, [])

  const solve = useCallback(() => {
    const steps = solvePuzzle(grid)
    setSolution(steps)
    setCurrentStep(0)
  }, [grid])

  const reset = useCallback(() => {
    setSolution(null)
    setCurrentStep(0)
  }, [])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  const nextStep = useCallback(() => {
    if (solution) {
      setCurrentStep(prev => Math.min(solution.length - 1, prev + 1))
    }
  }, [solution])

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }, [])

  const currentDisplayGrid = useMemo(() => {
    if (!solution || currentStep === 0) return grid
    return solution[currentStep - 1].gridAfter
  }, [grid, solution, currentStep])

  const highlightedCells = useMemo(() => {
    if (!solution || currentStep >= solution.length) return new Set<string>()
    return new Set(solution[currentStep].cells.map(c => `${c.row}-${c.col}`))
  }, [solution, currentStep])

  const totalCleared = useMemo(() => {
    if (!solution) return 0
    return solution.reduce((acc, step) => acc + step.cells.length, 0)
  }, [solution])

  return {
    // Grid state
    width,
    height,
    grid,
    setWidth,
    setHeight,
    
    // Solution state
    solution,
    currentStep,
    currentDisplayGrid,
    highlightedCells,
    totalCleared,
    
    // Actions
    initializeGrid,
    updateCell,
    solve,
    reset,
    goToStep,
    nextStep,
    prevStep,
  }
}

