import type { Step } from '../types'
import { MiniGrid } from './MiniGrid'
import { countRemainingBlocks, getSelectionType } from '../lib/utils'

interface SolutionDisplayProps {
  solution: Step[]
  currentStep: number
  grid: number[][]
  highlightedCells: Set<string>
  totalCleared: number
  onStepChange: (step: number) => void
  onPrevStep: () => void
  onNextStep: () => void
}

export const SolutionDisplay = ({
  solution,
  currentStep,
  grid,
  highlightedCells,
  totalCleared,
  onStepChange,
  onPrevStep,
  onNextStep,
}: SolutionDisplayProps) => {
  if (solution.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-orange-600 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
          Solution Steps
        </h2>
        <div className="text-center py-8">
          <p className="text-xl text-red-500">❌ No valid moves found!</p>
          <p className="text-slate-500 mt-2">Try different numbers or check your input.</p>
        </div>
      </div>
    )
  }

  const currentStepData = solution[currentStep]
  const selectionType = currentStepData ? getSelectionType(currentStepData.cells) : 'Single'
  const currentGridForMini = currentStep === 0 ? grid : solution[currentStep - 1]?.gridAfter ?? grid

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <h2 className="text-lg font-semibold text-orange-600 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
        Solution Steps
      </h2>

      {/* Summary */}
      <div className="mb-6 p-4 bg-linear-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
        <p className="text-emerald-700 font-semibold">
          ✅ Found {solution.length} moves, clearing {totalCleared} blocks!
        </p>
        <p className="text-sm text-emerald-600 mt-1">
          Remaining blocks: {countRemainingBlocks(solution[solution.length - 1].gridAfter)}
        </p>
      </div>

      {/* Step navigation */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => onStepChange(0)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 0 
              ? 'bg-orange-500 text-white' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Initial
        </button>
        {solution.map((_, idx) => (
          <button
            key={idx}
            onClick={() => onStepChange(idx)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === idx && idx > 0
                ? 'bg-orange-500 text-white' 
                : currentStep === idx
                  ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Step {idx + 1}
          </button>
        ))}
      </div>

      {/* Current step details */}
      {currentStep < solution.length && currentStepData && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex gap-6 items-start">
            {/* Mini grid visualization */}
            <div className="shrink-0">
              <p className="text-xs text-slate-500 mb-2 text-center">Grid Overview</p>
              <MiniGrid 
                grid={currentGridForMini}
                highlightedCells={highlightedCells}
                gridWidth={grid[0]?.length ?? 0}
                gridHeight={grid.length}
              />
            </div>
            
            {/* Step details */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-orange-600">
                  Step {currentStep + 1}
                </h3>
                <span className={`
                  px-2 py-0.5 rounded text-xs font-medium
                  ${selectionType === 'Horizontal' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : selectionType === 'Vertical'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : selectionType === 'Rectangle'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'}
                `}>
                  {selectionType}
                </span>
              </div>
              
              {/* Position indicator */}
              {(() => {
                const cells = currentStepData.cells
                const rows = [...new Set(cells.map(c => c.row + 1))].sort((a, b) => a - b)
                const cols = [...new Set(cells.map(c => c.col + 1))].sort((a, b) => a - b)
                return (
                  <p className="text-sm text-slate-600 mb-3">
                    📍 Row{rows.length > 1 ? 's' : ''} <strong className="text-slate-800">{rows.join('-')}</strong>, 
                    Col{cols.length > 1 ? 's' : ''} <strong className="text-slate-800">{cols.join('-')}</strong>
                  </p>
                )
              })()}
              
              <div className="flex flex-wrap gap-2 mb-3">
                {currentStepData.cells.map((cell, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-orange-100 border border-orange-200 rounded-lg text-orange-700 font-mono text-sm"
                  >
                    R{cell.row + 1}C{cell.col + 1}: <strong>{cell.value}</strong>
                  </span>
                ))}
              </div>
              <p className="text-slate-600 text-sm">
                Sum: {currentStepData.cells.map(c => c.value).join(' + ')} = <strong className="text-orange-600">10</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={onPrevStep}
          disabled={currentStep === 0}
          className="px-6 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 rounded-lg font-medium transition-colors"
        >
          ← Previous
        </button>
        <button
          onClick={onNextStep}
          disabled={currentStep >= solution.length - 1}
          className="px-6 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 rounded-lg font-medium transition-colors"
        >
          Next →
        </button>
        <span className="text-xs text-slate-400 ml-2">
          💡 Use <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-500">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-500">→</kbd> arrow keys
        </span>
      </div>
    </div>
  )
}
