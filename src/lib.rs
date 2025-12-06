mod utils;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

// Use a flat grid representation for cache efficiency
// Grid is stored as a single contiguous array with row-major order
#[derive(Clone)]
struct FlatGrid {
    data: Vec<u8>,
    rows: usize,
    cols: usize,
}

impl FlatGrid {
    fn new(grid: &[Vec<u8>]) -> Self {
        let rows = grid.len();
        let cols = if rows > 0 { grid[0].len() } else { 0 };
        let data: Vec<u8> = grid.iter().flatten().copied().collect();
        Self { data, rows, cols }
    }

    #[inline]
    fn get(&self, row: usize, col: usize) -> u8 {
        self.data[row * self.cols + col]
    }

    #[inline]
    fn set(&mut self, row: usize, col: usize, value: u8) {
        self.data[row * self.cols + col] = value;
    }

    fn to_vec(&self) -> Vec<Vec<u8>> {
        self.data
            .chunks(self.cols)
            .map(|chunk| chunk.to_vec())
            .collect()
    }

    // Fast hash for memoization - uses the raw bytes directly
    fn hash_key(&self) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        self.data.hash(&mut hasher);
        hasher.finish()
    }

    fn count_remaining(&self) -> usize {
        self.data.iter().filter(|&&v| v > 0).count()
    }

    fn apply_move(&self, cells: &[(usize, usize)]) -> Self {
        let mut new_grid = self.clone();
        for &(row, col) in cells {
            new_grid.set(row, col, 0);
        }
        new_grid
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cell {
    pub row: usize,
    pub col: usize,
    pub value: u8,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Step {
    pub cells: Vec<Cell>,
    pub sum: u8,
    #[serde(rename = "gridAfter")]
    pub grid_after: Vec<Vec<u8>>,
}

// Compact representation for internal use (row, col, value)
type CellTuple = (usize, usize, u8);

// Combination stored as sorted list of (row, col) for deduplication
type CombinationKey = Vec<(usize, usize)>;

#[derive(Clone)]
struct SearchState {
    grid: FlatGrid,
    steps: Vec<Step>,
    total_score: i32,
    // Pre-computed for sorting
    priority: i32,
    remaining: usize,
}

/// Calculate move score - clearing more blocks gives higher score
/// Score = n * (n + 1) / 2
#[inline]
fn calculate_move_score(cells_cleared: usize) -> i32 {
    let n = cells_cleared as i32;
    (n * (n + 1)) / 2
}

/// Find subsets that sum to target using branch-and-bound pruning
/// Much faster than generating all 2^n subsets when values are positive
fn find_subsets_with_sum(
    cells: &[CellTuple],
    target: u16,
    result: &mut Vec<Vec<CellTuple>>,
) {
    let n = cells.len();
    if n == 0 || n > 20 {
        // Safety limit for very large inputs
        return;
    }

    // Pre-compute suffix sums for pruning
    let mut suffix_sum = vec![0u16; n + 1];
    for i in (0..n).rev() {
        suffix_sum[i] = suffix_sum[i + 1] + cells[i].2 as u16;
    }

    let mut current: Vec<CellTuple> = Vec::with_capacity(n);
    
    fn backtrack(
        cells: &[CellTuple],
        idx: usize,
        current_sum: u16,
        target: u16,
        suffix_sum: &[u16],
        current: &mut Vec<CellTuple>,
        result: &mut Vec<Vec<CellTuple>>,
    ) {
        if current_sum == target && !current.is_empty() {
            result.push(current.clone());
            // Don't return - there might be more combinations including zeros
        }

        if idx >= cells.len() {
            return;
        }

        // Pruning: if current_sum + all remaining < target, skip
        if current_sum + suffix_sum[idx] < target {
            return;
        }

        // Pruning: if current_sum already exceeds target, skip
        if current_sum > target {
            return;
        }

        let (row, col, value) = cells[idx];

        // Include current cell
        current.push((row, col, value));
        backtrack(cells, idx + 1, current_sum + value as u16, target, suffix_sum, current, result);
        current.pop();

        // Exclude current cell
        backtrack(cells, idx + 1, current_sum, target, suffix_sum, current, result);
    }

    backtrack(cells, 0, 0, target, &suffix_sum, &mut current, result);
}

/// Check if a horizontal selection is contiguous (no gaps with non-zero values)
#[inline]
fn is_valid_horizontal(cells: &[CellTuple], grid: &FlatGrid, row: usize) -> bool {
    if cells.len() <= 1 {
        return !cells.is_empty();
    }

    let min_col = cells.iter().map(|c| c.1).min().unwrap();
    let max_col = cells.iter().map(|c| c.1).max().unwrap();

    // Check all cells in range - must be either selected or empty
    let selected: u32 = cells.iter().fold(0u32, |acc, c| acc | (1 << c.1));
    
    for col in min_col..=max_col {
        if (selected & (1 << col)) == 0 && grid.get(row, col) != 0 {
            return false;
        }
    }
    true
}

/// Check if a vertical selection is contiguous
#[inline]
fn is_valid_vertical(cells: &[CellTuple], grid: &FlatGrid, col: usize) -> bool {
    if cells.len() <= 1 {
        return !cells.is_empty();
    }

    let min_row = cells.iter().map(|c| c.0).min().unwrap();
    let max_row = cells.iter().map(|c| c.0).max().unwrap();

    let selected: u32 = cells.iter().fold(0u32, |acc, c| acc | (1 << c.0));
    
    for row in min_row..=max_row {
        if (selected & (1 << row)) == 0 && grid.get(row, col) != 0 {
            return false;
        }
    }
    true
}

/// Find all valid combinations that sum to 10
fn find_valid_combinations(grid: &FlatGrid) -> Vec<Vec<CellTuple>> {
    let mut combinations: Vec<Vec<CellTuple>> = Vec::new();
    let mut seen: HashMap<CombinationKey, ()> = HashMap::new();

    let add_combination = |cells: Vec<CellTuple>, 
                          combinations: &mut Vec<Vec<CellTuple>>, 
                          seen: &mut HashMap<CombinationKey, ()>| {
        let mut key: CombinationKey = cells.iter().map(|c| (c.0, c.1)).collect();
        key.sort_unstable();
        
        if seen.insert(key, ()).is_none() {
            combinations.push(cells);
        }
    };

    // 1. HORIZONTAL combinations
    for row in 0..grid.rows {
        let row_cells: Vec<CellTuple> = (0..grid.cols)
            .filter_map(|col| {
                let v = grid.get(row, col);
                if v > 0 { Some((row, col, v)) } else { None }
            })
            .collect();

        if row_cells.is_empty() {
            continue;
        }

        let mut subsets = Vec::new();
        find_subsets_with_sum(&row_cells, 10, &mut subsets);

        for subset in subsets {
            if is_valid_horizontal(&subset, grid, row) {
                add_combination(subset, &mut combinations, &mut seen);
            }
        }
    }

    // 2. VERTICAL combinations
    for col in 0..grid.cols {
        let col_cells: Vec<CellTuple> = (0..grid.rows)
            .filter_map(|row| {
                let v = grid.get(row, col);
                if v > 0 { Some((row, col, v)) } else { None }
            })
            .collect();

        if col_cells.is_empty() {
            continue;
        }

        let mut subsets = Vec::new();
        find_subsets_with_sum(&col_cells, 10, &mut subsets);

        for subset in subsets {
            if is_valid_vertical(&subset, grid, col) {
                add_combination(subset, &mut combinations, &mut seen);
            }
        }
    }

    // 3. RECTANGULAR combinations - optimized with early sum check
    for min_row in 0..grid.rows {
        for min_col in 0..grid.cols {
            let mut running_sum: u16 = 0;
            let mut rect_cells: Vec<CellTuple> = Vec::new();

            for max_row in min_row..grid.rows {
                // Add cells from new row
                for c in min_col..grid.cols {
                    let v = grid.get(max_row, c);
                    if v > 0 {
                        running_sum += v as u16;
                        rect_cells.push((max_row, c, v));
                    }

                    // Skip single row/col
                    if max_row == min_row || c == min_col {
                        continue;
                    }

                    // Early termination if sum exceeds 10
                    if running_sum > 10 {
                        // But we still need to track for larger rectangles
                    }

                    // Check exact sum for current rectangle
                    let current_rect: Vec<CellTuple> = rect_cells
                        .iter()
                        .filter(|&&(r, col, _)| r <= max_row && col <= c)
                        .copied()
                        .collect();
                    
                    let sum: u16 = current_rect.iter().map(|t| t.2 as u16).sum();
                    
                    if sum == 10 && !current_rect.is_empty() {
                        add_combination(current_rect, &mut combinations, &mut seen);
                    }
                }
            }
        }
    }

    combinations
}

/// Convert internal cell format to output format
fn cells_to_output(cells: &[CellTuple]) -> Vec<Cell> {
    cells
        .iter()
        .map(|&(row, col, value)| Cell { row, col, value })
        .collect()
}

/// Estimate future score - simplified for performance
/// Only looks at horizontal/vertical, skips rectangles
fn estimate_future_score_fast(grid: &FlatGrid) -> i32 {
    let mut max_combo_size = 0usize;

    // Quick scan for potential large combinations
    for row in 0..grid.rows {
        let row_cells: Vec<CellTuple> = (0..grid.cols)
            .filter_map(|col| {
                let v = grid.get(row, col);
                if v > 0 { Some((row, col, v)) } else { None }
            })
            .collect();

        if row_cells.len() > max_combo_size {
            let mut subsets = Vec::new();
            find_subsets_with_sum(&row_cells, 10, &mut subsets);
            for subset in &subsets {
                if is_valid_horizontal(subset, grid, row) {
                    max_combo_size = max_combo_size.max(subset.len());
                }
            }
        }
    }

    for col in 0..grid.cols {
        let col_cells: Vec<CellTuple> = (0..grid.rows)
            .filter_map(|row| {
                let v = grid.get(row, col);
                if v > 0 { Some((row, col, v)) } else { None }
            })
            .collect();

        if col_cells.len() > max_combo_size {
            let mut subsets = Vec::new();
            find_subsets_with_sum(&col_cells, 10, &mut subsets);
            for subset in &subsets {
                if is_valid_vertical(subset, grid, col) {
                    max_combo_size = max_combo_size.max(subset.len());
                }
            }
        }
    }

    calculate_move_score(max_combo_size)
}

/// Beam Search solver with optimizations
fn solve_puzzle_beam_search(initial_grid: &FlatGrid, beam_width: usize) -> Vec<Step> {
    let mut visited: HashMap<u64, i32> = HashMap::with_capacity(1000);

    let initial_priority = estimate_future_score_fast(initial_grid);
    let initial_remaining = initial_grid.count_remaining();

    let mut beam: Vec<SearchState> = vec![SearchState {
        grid: initial_grid.clone(),
        steps: Vec::new(),
        total_score: 0,
        priority: initial_priority,
        remaining: initial_remaining,
    }];

    let mut best_solution: Vec<Step> = Vec::new();
    let mut best_score: i32 = -1;
    let mut best_remaining_cells = usize::MAX;

    while !beam.is_empty() {
        let mut next_beam: Vec<SearchState> = Vec::with_capacity(beam_width * 10);

        for state in &beam {
            let combinations = find_valid_combinations(&state.grid);

            if combinations.is_empty() {
                if state.total_score > best_score
                    || (state.total_score == best_score && state.remaining < best_remaining_cells)
                {
                    best_score = state.total_score;
                    best_remaining_cells = state.remaining;
                    best_solution = state.steps.clone();
                }
                continue;
            }

            for combo in combinations {
                let positions: Vec<(usize, usize)> = combo.iter().map(|c| (c.0, c.1)).collect();
                let new_grid = state.grid.apply_move(&positions);
                let grid_key = new_grid.hash_key();
                let move_score = calculate_move_score(combo.len());
                let new_total_score = state.total_score + move_score;

                // Skip if we've seen this state with equal or better score
                if let Some(&existing_score) = visited.get(&grid_key) {
                    if existing_score >= new_total_score {
                        continue;
                    }
                }
                visited.insert(grid_key, new_total_score);

                let new_remaining = new_grid.count_remaining();
                let new_priority = new_total_score + estimate_future_score_fast(&new_grid);

                let new_step = Step {
                    cells: cells_to_output(&combo),
                    sum: 10,
                    grid_after: new_grid.to_vec(),
                };

                let mut new_steps = state.steps.clone();
                new_steps.push(new_step);

                next_beam.push(SearchState {
                    grid: new_grid,
                    steps: new_steps,
                    total_score: new_total_score,
                    priority: new_priority,
                    remaining: new_remaining,
                });
            }
        }

        // Sort by pre-computed priority (avoids recomputing during sort)
        next_beam.sort_unstable_by(|a, b| {
            match b.priority.cmp(&a.priority) {
                std::cmp::Ordering::Equal => a.remaining.cmp(&b.remaining),
                other => other,
            }
        });

        next_beam.truncate(beam_width);
        beam = next_beam;
    }

    best_solution
}

/// Greedy solver with look-ahead - optimized
fn solve_puzzle_greedy_lookahead(initial_grid: &FlatGrid, lookahead: usize) -> Vec<Step> {
    let mut steps: Vec<Step> = Vec::new();
    let mut current_grid = initial_grid.clone();

    loop {
        let combinations = find_valid_combinations(&current_grid);
        if combinations.is_empty() {
            break;
        }

        // Find best combination with lookahead
        let mut best_combo_idx = 0;
        let mut best_value = i32::MIN;

        for (idx, combo) in combinations.iter().enumerate() {
            let positions: Vec<(usize, usize)> = combo.iter().map(|c| (c.0, c.1)).collect();
            let score = evaluate_with_lookahead(&current_grid, &positions, combo.len(), lookahead);
            if score > best_value {
                best_value = score;
                best_combo_idx = idx;
            }
        }

        let best_combo = &combinations[best_combo_idx];
        let positions: Vec<(usize, usize)> = best_combo.iter().map(|c| (c.0, c.1)).collect();
        let new_grid = current_grid.apply_move(&positions);

        steps.push(Step {
            cells: cells_to_output(best_combo),
            sum: 10,
            grid_after: new_grid.to_vec(),
        });

        current_grid = new_grid;
    }

    steps
}

/// Evaluate a move with limited lookahead depth
fn evaluate_with_lookahead(grid: &FlatGrid, positions: &[(usize, usize)], combo_len: usize, depth: usize) -> i32 {
    let new_grid = grid.apply_move(positions);
    let immediate_score = calculate_move_score(combo_len);

    if depth <= 1 {
        let future_bonus = estimate_future_score_fast(&new_grid) / 2;
        return immediate_score + future_bonus;
    }

    let next_combos = find_valid_combinations(&new_grid);
    if next_combos.is_empty() {
        let remaining = new_grid.count_remaining() as i32;
        return immediate_score - remaining / 10;
    }

    // Only evaluate top candidates to limit branching
    let max_evaluate = 5.min(next_combos.len());
    let mut best_future_score = 0;
    
    for combo in next_combos.iter().take(max_evaluate) {
        let positions: Vec<(usize, usize)> = combo.iter().map(|c| (c.0, c.1)).collect();
        let future_score = evaluate_with_lookahead(&new_grid, &positions, combo.len(), depth - 1);
        best_future_score = best_future_score.max(future_score);
    }

    immediate_score + (best_future_score * 9 / 10) // 90% weight for future
}

/// Main solver function - entry point from WASM
#[wasm_bindgen]
pub fn solve_puzzle(grid_js: JsValue) -> Result<JsValue, JsValue> {
    utils::set_panic_hook();

    let grid_vec: Vec<Vec<u8>> = serde_wasm_bindgen::from_value(grid_js)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse grid: {}", e)))?;

    let grid = FlatGrid::new(&grid_vec);
    let total_cells = grid.count_remaining();

    let steps = if total_cells <= 30 {
        solve_puzzle_beam_search(&grid, 20)
    } else if total_cells <= 50 {
        solve_puzzle_beam_search(&grid, 12)
    } else {
        solve_puzzle_greedy_lookahead(&grid, 3)
    };

    serde_wasm_bindgen::to_value(&steps)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Initialize the WASM module (call once)
#[wasm_bindgen(start)]
pub fn init() {
    utils::set_panic_hook();
}
