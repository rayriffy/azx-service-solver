import type { Cell, Step } from '../types'

// Generate all subsets of an array
const getAllSubsets = <T,>(arr: T[]): T[][] => {
  const subsets: T[][] = [[]]
  
  for (const item of arr) {
    const newSubsets = subsets.map(subset => [...subset, item])
    subsets.push(...newSubsets)
  }
  
  return subsets
}

// Check if horizontal selection is valid (blocks between selected cells must be empty or selected)
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

// Check if vertical selection is valid (blocks between selected cells must be empty or selected)
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

// Find all valid combinations that sum to 10 (horizontal, vertical, and rectangular)
export const findValidCombinations = (grid: number[][]): Cell[][] => {
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

  // 1. HORIZONTAL: For each row, find all valid horizontal selections
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

  // 2. VERTICAL: For each column, find all valid vertical selections
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

  // 3. RECTANGULAR: Find all valid rectangular selections
  for (let minRow = 0; minRow < rows; minRow++) {
    for (let minCol = 0; minCol < cols; minCol++) {
      for (let maxRow = minRow; maxRow < rows; maxRow++) {
        for (let maxCol = minCol; maxCol < cols; maxCol++) {
          // Skip single row or single column (already covered above)
          if (minRow === maxRow || minCol === maxCol) continue
          
          // Get all non-empty cells in this rectangle
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
          
          // For rectangular selection, all cells in the rectangle must be selected
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

// Solve the puzzle - find optimal sequence of moves
export const solvePuzzle = (initialGrid: number[][]): Step[] => {
  const steps: Step[] = []
  let currentGrid = initialGrid.map(row => [...row])

  while (true) {
    const combinations = findValidCombinations(currentGrid)
    if (combinations.length === 0) break

    // Prioritize combinations that:
    // 1. Clear more cells
    // 2. Clear cells that might block others
    const sortedCombinations = [...combinations].sort((a, b) => {
      // Prefer clearing more blocks
      if (b.length !== a.length) return b.length - a.length
      // Then prefer leftmost selections (arbitrary tiebreaker)
      return a[0].col - b[0].col
    })

    const bestCombination = sortedCombinations[0]
    
    // Apply the combination
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

