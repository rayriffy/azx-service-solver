interface GridInputProps {
  grid: number[][]
  currentDisplayGrid: number[][]
  highlightedCells: Set<string>
  hasSolution: boolean
  isSolving: boolean
  onCellChange: (row: number, col: number, value: number) => void
  onSolve: () => void
  onReset: () => void
  setInputRef: (row: number, col: number, el: HTMLInputElement | null) => void
  focusNextCell: (row: number, col: number) => void
}

export const GridInput = ({
  grid,
  currentDisplayGrid,
  highlightedCells,
  hasSolution,
  isSolving,
  onCellChange,
  onSolve,
  onReset,
  setInputRef,
  focusNextCell,
}: GridInputProps) => {
  const handleCellChange = (row: number, col: number, value: string) => {
    const numValue = parseInt(value) || 0
    onCellChange(row, col, numValue)
    
    // Auto-focus to next cell if a valid number was entered
    if (value.length > 0 && numValue >= 0 && numValue <= 9) {
      const isLastCell = row === grid.length - 1 && col === grid[0].length - 1
      
      if (!isLastCell) {
        focusNextCell(row, col)
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 mb-8 border border-slate-200 shadow-sm">
      <h2 className="text-lg font-semibold text-orange-600 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
        Enter Block Values
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Fill in the numbers from your cargo spaces. Each row represents one cargo space.
      </p>
      
      <div className="flex flex-col gap-2 mb-6 overflow-y-auto pr-2">
        {grid.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-2">
            <span className="w-16 text-sm text-slate-500 font-mono shrink-0">R{rowIdx + 1}:</span>
            <div className="flex gap-1">
              {row.map((cell, colIdx) => {
                const isHighlighted = highlightedCells.has(`${rowIdx}-${colIdx}`)
                const displayValue = currentDisplayGrid[rowIdx]?.[colIdx] ?? cell
                
                return (
                  <input
                    key={colIdx}
                    ref={(el) => setInputRef(rowIdx, colIdx, el)}
                    type="number"
                    min={0}
                    max={9}
                    value={hasSolution ? (displayValue || '') : (cell || '')}
                    onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                    disabled={hasSolution || isSolving}
                    className={`
                      w-12 h-12 text-center text-xl font-bold rounded-xl 
                      border-2 transition-all duration-300
                      ${isHighlighted 
                        ? 'bg-orange-500 border-orange-400 text-white scale-110 shadow-lg shadow-orange-500/40' 
                        : displayValue === 0 
                          ? 'bg-slate-100 border-slate-200 text-slate-400' 
                          : 'bg-white border-slate-300 text-slate-800 hover:border-indigo-400'}
                      focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20
                      disabled:cursor-default
                    `}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onSolve}
          disabled={hasSolution || isSolving}
          className="px-8 py-3 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-500/30 disabled:shadow-none flex items-center gap-2"
        >
          {isSolving ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Solving...
            </>
          ) : (
            '🔍 Solve Puzzle'
          )}
        </button>
        {hasSolution && (
          <button
            onClick={onReset}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-colors"
          >
            ↺ Reset
          </button>
        )}
      </div>
    </div>
  )
}
