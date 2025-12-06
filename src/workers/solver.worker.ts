// Web Worker for solving puzzles using Rust WASM

import init, { solve_puzzle } from '../../pkg/azx_solver'

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
  type: 'result' | 'error' | 'ready'
  steps?: Step[]
  error?: string
}

let wasmInitialized = false

// Initialize WASM module
const initWasm = async () => {
  if (!wasmInitialized) {
    await init()
    wasmInitialized = true
  }
}

// Initialize on worker start
initWasm().then(() => {
  self.postMessage({ type: 'ready' } satisfies WorkerResponse)
}).catch(error => {
  self.postMessage({ 
    type: 'error', 
    error: `Failed to initialize WASM: ${error instanceof Error ? error.message : 'Unknown error'}` 
  } satisfies WorkerResponse)
})

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, grid } = event.data
  
  if (type === 'solve') {
    try {
      // Ensure WASM is initialized
      await initWasm()
      
      // Convert grid to u8 values for WASM (the Rust code expects u8)
      const u8Grid = grid.map(row => row.map(v => v))
      
      // Call the Rust WASM solver
      const steps = solve_puzzle(u8Grid) as Step[]
      
      self.postMessage({ type: 'result', steps } satisfies WorkerResponse)
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      } satisfies WorkerResponse)
    }
  }
}
