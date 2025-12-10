import type { Cell } from '../types'

// Count remaining blocks in a grid
export const countRemainingBlocks = (grid: number[][]): number => {
  return grid.flat().filter(v => v > 0).length
}

// Get selection type description based on cells
export const getSelectionType = (cells: Cell[]): 'Single' | 'Horizontal' | 'Vertical' | 'Rectangle' => {
  if (cells.length === 1) return 'Single'
  
  const rows = [...new Set(cells.map(c => c.row))]
  const cols = [...new Set(cells.map(c => c.col))]
  
  if (rows.length === 1) return 'Horizontal'
  if (cols.length === 1) return 'Vertical'
  return 'Rectangle'
}

// Create an empty grid with specified dimensions
export const createEmptyGrid = (height: number, width: number): number[][] => {
  return Array(height).fill(null).map(() => Array(width).fill(0))
}


