export interface Cell {
  row: number
  col: number
  value: number
}

export interface Step {
  cells: Cell[]
  sum: number
  gridAfter: number[][]
}

