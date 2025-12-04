# Grid Extraction Rule

This rule enables the `/extract-grid` command behavior.

name: extract_grid_command
description: implementation of /extract-grid <size> command
filters:
  - type: content
    pattern: "^/extract-grid"

actions:
  - type: suggest
    message: |
      To process the `/extract-grid <COL>x<ROW>` command:

      1.  **Analyze the Request**:
          *   Parse the dimensions provided (e.g., `10x16` means 10 rows, 16 columns).
          *   Identify the image source (attached image or most recent image in context).

      2.  **Extract Data**:
          *   Use your vision capabilities to read the grid of numbers from the image.
          *   Ensure you extract exactly `COLS * ROWS` numbers.
          *   Organize them into a 2D array (list of lists) matching the dimensions.
          *   **Structure**: The outer array represents rows (from top to bottom). Each inner array represents a row, containing numbers for that row's columns (from left to right).

      3.  **Output Format**:
          *   Return **ONLY** the 2D JSON array in a code block.
          *   Do not add conversational filler unless there is an error or ambiguity.

      **Example:**
      User: `/extract-grid 3x2` (with image)
      Assistant:
      ```json
      [
        [1, 2, 3], // Row 1: Left -> Right
        [4, 5, 6]  // Row 2: Left -> Right
      ]
      ```
