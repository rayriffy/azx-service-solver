import { GridConfig, GridInput, SolutionDisplay } from './components'
import { useSolver, useGridInput, useKeyboardNavigation } from './hooks'

export const App = () => {
  const {
    width,
    height,
    grid,
    setWidth,
    setHeight,
    solution,
    currentStep,
    currentDisplayGrid,
    highlightedCells,
    totalCleared,
    isSolving,
    initializeGrid,
    updateCell,
    solve,
    reset,
    goToStep,
    nextStep,
    prevStep,
  } = useSolver()

  const { setInputRef, focusNextCell } = useGridInput(grid.length, grid[0]?.length ?? 0)

  useKeyboardNavigation({
    enabled: !!solution && solution.length > 0,
    maxStep: solution?.length ?? 0,
    onNext: nextStep,
    onPrev: prevStep,
  })

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-orange-50 to-amber-50 text-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <GridConfig
          width={width}
          height={height}
          onWidthChange={setWidth}
          onHeightChange={setHeight}
          onCreateGrid={initializeGrid}
        />

        <GridInput
          grid={grid}
          currentDisplayGrid={currentDisplayGrid}
          highlightedCells={highlightedCells}
          hasSolution={!!solution}
          isSolving={isSolving}
          onCellChange={updateCell}
          onSolve={solve}
          onReset={reset}
          setInputRef={setInputRef}
          focusNextCell={focusNextCell}
        />

        {solution && (
          <SolutionDisplay
            solution={solution}
            currentStep={currentStep}
            grid={grid}
            highlightedCells={highlightedCells}
            totalCleared={totalCleared}
            onStepChange={goToStep}
            onPrevStep={prevStep}
            onNextStep={nextStep}
          />
        )}
      </div>
    </div>
  )
}
