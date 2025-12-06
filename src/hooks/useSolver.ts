import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { Step } from '../types'
import { createEmptyGrid } from '../lib/utils'

const DEFAULT_WIDTH = 8
const DEFAULT_HEIGHT = 14

interface WorkerMessage {
  type: 'solve'
  grid: number[][]
}

interface WorkerResponse {
  type: 'result' | 'error' | 'ready'
  steps?: Step[]
  error?: string
}

export const useSolver = () => {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [grid, setGrid] = useState<number[][]>(() => 
    createEmptyGrid(DEFAULT_HEIGHT, DEFAULT_WIDTH)
  )
  const [solution, setSolution] = useState<Step[] | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isSolving, setIsSolving] = useState(false)
  const [isWasmReady, setIsWasmReady] = useState(false)
  
  const workerRef = useRef<Worker | null>(null)

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/solver.worker.ts', import.meta.url),
      { type: 'module' }
    )
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type } = event.data
      
      if (type === 'ready') {
        setIsWasmReady(true)
      } else if (type === 'result' && event.data.steps) {
        setSolution(event.data.steps)
        setCurrentStep(0)
        setIsSolving(false)
      } else if (type === 'error') {
        console.error('Solver error:', event.data.error)
        setSolution([])
        setIsSolving(false)
      }
    }
    
    worker.onerror = (error) => {
      console.error('Worker error:', error)
      setIsSolving(false)
    }
    
    workerRef.current = worker
    
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const initializeGrid = useCallback(() => {
    setGrid(createEmptyGrid(height, width))
    setSolution(null)
    setCurrentStep(0)
  }, [width, height])

  const importGrid = useCallback((newGrid: number[][]) => {
    if (!newGrid || newGrid.length === 0 || !newGrid[0] || newGrid[0].length === 0) {
      return false
    }
    
    const newHeight = newGrid.length
    const newWidth = newGrid[0].length
    
    // Validate that all rows have the same length and values are 0-9
    for (const row of newGrid) {
      if (row.length !== newWidth) return false
      for (const cell of row) {
        if (typeof cell !== 'number' || cell < 0 || cell > 9 || !Number.isInteger(cell)) {
          return false
        }
      }
    }
    
    setWidth(newWidth)
    setHeight(newHeight)
    setGrid(newGrid.map(row => [...row]))
    setSolution(null)
    setCurrentStep(0)
    return true
  }, [])

  const exportGrid = useCallback(() => {
    return JSON.stringify(grid, null, 2)
  }, [grid])

  const updateCell = useCallback((row: number, col: number, value: number) => {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      newGrid[row][col] = Math.min(9, Math.max(0, value))
      return newGrid
    })
    setSolution(null)
  }, [])

  const solve = useCallback(() => {
    if (!workerRef.current || isSolving) return
    
    setIsSolving(true)
    workerRef.current.postMessage({
      type: 'solve',
      grid
    } satisfies WorkerMessage)
  }, [grid, isSolving])

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
    
    // Loading state
    isSolving,
    isWasmReady,
    
    // Actions
    initializeGrid,
    updateCell,
    solve,
    reset,
    goToStep,
    nextStep,
    prevStep,
    importGrid,
    exportGrid,
  }
}
