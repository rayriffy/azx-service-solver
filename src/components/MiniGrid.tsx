import { useMemo } from 'react'

interface MiniGridProps {
  grid: number[][]
  highlightedCells: Set<string>
  gridWidth: number
  gridHeight: number
}

export const MiniGrid = ({ 
  grid, 
  highlightedCells,
  gridWidth,
  gridHeight 
}: MiniGridProps) => {
  const highlightBounds = useMemo(() => {
    if (highlightedCells.size === 0) return null
    
    const cells = Array.from(highlightedCells).map(key => {
      const [row, col] = key.split('-').map(Number)
      return { row, col }
    })
    
    return {
      minRow: Math.min(...cells.map(c => c.row)),
      maxRow: Math.max(...cells.map(c => c.row)),
      minCol: Math.min(...cells.map(c => c.col)),
      maxCol: Math.max(...cells.map(c => c.col))
    }
  }, [highlightedCells])

  return (
    <div className="inline-block p-2 bg-slate-100 rounded-lg border border-slate-200">
      <div 
        className="grid gap-px"
        style={{ 
          gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
          gridTemplateRows: `repeat(${gridHeight}, 1fr)`
        }}
      >
        {Array.from({ length: gridHeight }).map((_, rowIdx) => (
          Array.from({ length: gridWidth }).map((_, colIdx) => {
            const key = `${rowIdx}-${colIdx}`
            const isHighlighted = highlightedCells.has(key)
            const value = grid[rowIdx]?.[colIdx] ?? 0
            const isEmpty = value === 0
            const isInBounds = highlightBounds && 
              rowIdx >= highlightBounds.minRow && 
              rowIdx <= highlightBounds.maxRow &&
              colIdx >= highlightBounds.minCol && 
              colIdx <= highlightBounds.maxCol

            return (
              <div
                key={key}
                className={`
                  w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold
                  transition-all duration-200
                  ${isHighlighted 
                    ? 'bg-orange-500 text-white scale-125 z-10 shadow-md' 
                    : isEmpty 
                      ? 'bg-slate-200' 
                      : isInBounds
                        ? 'bg-indigo-200 text-indigo-700'
                        : 'bg-slate-300 text-slate-600'}
                `}
              >
                {value > 0 ? value : ''}
              </div>
            )
          })
        ))}
      </div>
    </div>
  )
}

