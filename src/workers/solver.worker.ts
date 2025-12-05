// Web Worker for solving puzzles off the main thread

interface Cell {
  row: number
  col: number
  value: number
}

interface Step {
  cells: Cell[]
  sum: number
  gridAfter: number[][]
}

interface WorkerMessage {
  type: 'solve'
  grid: number[][]
}

interface WorkerResponse {
  type: 'result' | 'error'
  steps?: Step[]
  error?: string
}

// Generate all subsets of an array
const getAllSubsets = <T,>(arr: T[]): T[][] => {
  const subsets: T[][] = [[]]
  
  for (const item of arr) {
    const newSubsets = subsets.map(subset => [...subset, item])
    subsets.push(...newSubsets)
  }
  
  return subsets
}

// Check if horizontal selection is valid
const isValidHorizontalSelection = (cells: Cell[], row: number[]): boolean => {
  if (cells.length === 0) return false
  if (cells.length === 1) return true

  const cols = cells.map(c => c.col).sort((a, b) => a - b)
  const minCol = cols[0]
  const maxCol = cols[cols.length - 1]

  for (let col = minCol; col <= maxCol; col++) {
    const value = row[col]
    const isSelected = cells.some(c => c.col === col)
    
    if (!isSelected && value !== 0) {
      return false
    }
  }

  return true
}

// Check if vertical selection is valid
const isValidVerticalSelection = (cells: Cell[], grid: number[][], col: number): boolean => {
  if (cells.length === 0) return false
  if (cells.length === 1) return true

  const rows = cells.map(c => c.row).sort((a, b) => a - b)
  const minRow = rows[0]
  const maxRow = rows[rows.length - 1]

  for (let row = minRow; row <= maxRow; row++) {
    const value = grid[row][col]
    const isSelected = cells.some(c => c.row === row)
    
    if (!isSelected && value !== 0) {
      return false
    }
  }

  return true
}

// Find all valid combinations that sum to 10
const findValidCombinations = (grid: number[][]): Cell[][] => {
  const rows = grid.length
  const cols = grid[0]?.length || 0
  const combinations: Cell[][] = []
  const seen = new Set<string>()

  const addCombination = (cells: Cell[]) => {
    const key = cells.map(c => `${c.row}-${c.col}`).sort().join('|')
    if (!seen.has(key)) {
      seen.add(key)
      combinations.push(cells)
    }
  }

  // 1. HORIZONTAL
  for (let row = 0; row < rows; row++) {
    const rowCells = grid[row]
      .map((value, col) => ({ row, col, value }))
      .filter(cell => cell.value > 0)

    const subsets = getAllSubsets(rowCells)
    
    for (const subset of subsets) {
      if (subset.length === 0) continue
      
      const sum = subset.reduce((acc, cell) => acc + cell.value, 0)
      if (sum !== 10) continue
      
      if (isValidHorizontalSelection(subset, grid[row])) {
        addCombination(subset)
      }
    }
  }

  // 2. VERTICAL
  for (let col = 0; col < cols; col++) {
    const colCells: Cell[] = []
    for (let row = 0; row < rows; row++) {
      if (grid[row][col] > 0) {
        colCells.push({ row, col, value: grid[row][col] })
      }
    }

    const subsets = getAllSubsets(colCells)
    
    for (const subset of subsets) {
      if (subset.length === 0) continue
      
      const sum = subset.reduce((acc, cell) => acc + cell.value, 0)
      if (sum !== 10) continue
      
      if (isValidVerticalSelection(subset, grid, col)) {
        addCombination(subset)
      }
    }
  }

  // 3. RECTANGULAR
  for (let minRow = 0; minRow < rows; minRow++) {
    for (let minCol = 0; minCol < cols; minCol++) {
      for (let maxRow = minRow; maxRow < rows; maxRow++) {
        for (let maxCol = minCol; maxCol < cols; maxCol++) {
          if (minRow === maxRow || minCol === maxCol) continue
          
          const rectCells: Cell[] = []
          
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const value = grid[r][c]
              if (value > 0) {
                rectCells.push({ row: r, col: c, value })
              }
            }
          }
          
          if (rectCells.length === 0) continue
          
          const sum = rectCells.reduce((acc, cell) => acc + cell.value, 0)
          if (sum === 10) {
            addCombination(rectCells)
          }
        }
      }
    }
  }

  return combinations
}

// Solve the puzzle
const solvePuzzle = (initialGrid: number[][]): Step[] => {
  const steps: Step[] = []
  let currentGrid = initialGrid.map(row => [...row])

  while (true) {
    const combinations = findValidCombinations(currentGrid)
    if (combinations.length === 0) break

    const sortedCombinations = [...combinations].sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length
      return a[0].col - b[0].col
    })

    const bestCombination = sortedCombinations[0]
    
    const newGrid = currentGrid.map(row => [...row])
    for (const cell of bestCombination) {
      newGrid[cell.row][cell.col] = 0
    }

    steps.push({
      cells: bestCombination,
      sum: 10,
      gridAfter: newGrid
    })

    currentGrid = newGrid
  }

  return steps
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, grid } = event.data
  
  if (type === 'solve') {
    try {
      const steps = solvePuzzle(grid)
      self.postMessage({ type: 'result', steps } satisfies WorkerResponse)
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      } satisfies WorkerResponse)
    }
  }
}
