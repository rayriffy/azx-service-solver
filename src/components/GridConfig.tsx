import { useState } from 'react'

interface GridConfigProps {
  width: number
  height: number
  onWidthChange: (width: number) => void
  onHeightChange: (height: number) => void
  onCreateGrid: () => void
  onImportGrid: (grid: number[][]) => boolean
  onExportGrid: () => string
}

export const GridConfig = ({
  width,
  height,
  onWidthChange,
  onHeightChange,
  onCreateGrid,
  onImportGrid,
  onExportGrid,
}: GridConfigProps) => {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [exportStatus, setExportStatus] = useState<'idle' | 'success'>('idle')

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text)
      
      if (!Array.isArray(parsed) || !parsed.every(row => Array.isArray(row))) {
        throw new Error('Invalid format')
      }
      
      const success = onImportGrid(parsed)
      if (success) {
        setImportStatus('success')
        setTimeout(() => setImportStatus('idle'), 2000)
      } else {
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 2000)
      }
    } catch {
      setImportStatus('error')
      setTimeout(() => setImportStatus('idle'), 2000)
    }
  }

  const handleExport = async () => {
    try {
      const json = onExportGrid()
      await navigator.clipboard.writeText(json)
      setExportStatus('success')
      setTimeout(() => setExportStatus('idle'), 2000)
    } catch {
      console.error('Failed to copy to clipboard')
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 mb-8 border border-slate-200 shadow-sm">
      <h2 className="text-lg font-semibold text-orange-600 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
        Grid Configuration
      </h2>
      <div className="flex flex-wrap gap-6 items-end">
        <div>
          <label className="block text-sm text-slate-600 mb-2">Width (columns)</label>
          <input
            type="number"
            min={1}
            max={12}
            value={width}
            onChange={(e) => onWidthChange(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-24 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-2">Height (rows)</label>
          <input
            type="number"
            min={1}
            max={20}
            value={height}
            onChange={(e) => onHeightChange(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-24 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
          />
        </div>
        <button
          onClick={onCreateGrid}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Create Grid
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 ${
              importStatus === 'success'
                ? 'bg-green-500 text-white'
                : importStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {importStatus === 'success' ? (
              <>✓ Imported</>
            ) : importStatus === 'error' ? (
              <>✗ Invalid JSON</>
            ) : (
              <>📋 Import</>
            )}
          </button>
          <button
            onClick={handleExport}
            className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 ${
              exportStatus === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {exportStatus === 'success' ? (
              <>✓ Copied</>
            ) : (
              <>📤 Export</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

