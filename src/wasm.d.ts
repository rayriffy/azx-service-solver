// Type declarations for the WASM module
declare module '../../pkg/azx_solver' {
  export function solve_puzzle(grid: number[][]): {
    cells: { row: number; col: number; value: number }[]
    sum: number
    gridAfter: number[][]
  }[]
  
  export default function init(): Promise<void>
}

declare module '../pkg/azx_solver' {
  export function solve_puzzle(grid: number[][]): {
    cells: { row: number; col: number; value: number }[]
    sum: number
    gridAfter: number[][]
  }[]
  
  export default function init(): Promise<void>
}

