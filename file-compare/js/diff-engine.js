/**
 * Diff Engine - Text comparison using jsdiff library
 * Provides line-level and character-level diff functionality
 */

class DiffEngine {
    constructor() {
        this.leftLines = [];
        this.rightLines = [];
        this.diffResult = [];
        this.diffBlocks = []; // Groups of consecutive diff lines
        this.maxLinesForCharDiff = 5000; // Disable char diff for files larger than this
    }

    /**
     * Compare two text contents and return structured diff result
     * @param {string} leftText - Left side text content
     * @param {string} rightText - Right side text content
     * @returns {Object} Diff result with left and right line info
     */
    compare(leftText, rightText) {
        this.leftLines = this.splitLines(leftText);
        this.rightLines = this.splitLines(rightText);
        
        // For very large files, use optimized comparison
        const totalLines = this.leftLines.length + this.rightLines.length;
        
        // Use jsdiff to get line-level differences
        const diff = Diff.diffLines(leftText, rightText, {
            ignoreWhitespace: false,
            newlineIsToken: true
        });
        
        this.diffResult = this.processDiff(diff, totalLines < this.maxLinesForCharDiff);
        this.diffBlocks = this.groupDiffBlocks(this.diffResult);
        
        return this.diffResult;
    }

    /**
     * Split text into lines, preserving empty lines
     * @param {string} text 
     * @returns {string[]}
     */
    splitLines(text) {
        if (!text) return [];
        // Split by newlines but preserve the structure
        return text.split(/\r?\n/);
    }

    /**
     * Process jsdiff output into a structured format
     * @param {Array} diff - jsdiff output
     * @param {boolean} enableCharDiff - Whether to compute character-level diff
     * @returns {Object} Structured diff result
     */
    processDiff(diff, enableCharDiff = true) {
        this.enableCharDiff = enableCharDiff;
        const result = {
            left: [],
            right: [],
            pairs: [] // Paired lines for side-by-side view
        };

        let leftLineNum = 1;
        let rightLineNum = 1;

        diff.forEach((part) => {
            const lines = part.value.split(/\r?\n/);
            // Remove last empty element if the part ends with newline
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }

            lines.forEach((line) => {
                if (part.added) {
                    // Line only exists on right side
                    result.right.push({
                        lineNum: rightLineNum++,
                        content: line,
                        type: 'added'
                    });
                    result.pairs.push({
                        left: null,
                        right: result.right[result.right.length - 1]
                    });
                } else if (part.removed) {
                    // Line only exists on left side
                    result.left.push({
                        lineNum: leftLineNum++,
                        content: line,
                        type: 'removed'
                    });
                    result.pairs.push({
                        left: result.left[result.left.length - 1],
                        right: null
                    });
                } else {
                    // Line exists on both sides (unchanged)
                    const leftLine = {
                        lineNum: leftLineNum++,
                        content: line,
                        type: 'unchanged'
                    };
                    const rightLine = {
                        lineNum: rightLineNum++,
                        content: line,
                        type: 'unchanged'
                    };
                    result.left.push(leftLine);
                    result.right.push(rightLine);
                    result.pairs.push({
                        left: leftLine,
                        right: rightLine
                    });
                }
            });
        });

        // Process pairs to detect modifications (adjacent remove + add)
        this.detectModifications(result);

        return result;
    }

    /**
     * Detect modifications by finding adjacent removed/added pairs
     * @param {Object} result - Diff result to process
     */
    detectModifications(result) {
        const pairs = result.pairs;
        let i = 0;

        while (i < pairs.length) {
            // Look for a sequence of removed lines followed by added lines
            let removedStart = -1;
            let removedEnd = -1;
            let addedStart = -1;
            let addedEnd = -1;

            // Find removed sequence
            if (pairs[i].left && !pairs[i].right && pairs[i].left.type === 'removed') {
                removedStart = i;
                while (i < pairs.length && pairs[i].left && !pairs[i].right) {
                    removedEnd = i;
                    i++;
                }
            }

            // Check if immediately followed by added sequence
            if (removedStart !== -1 && i < pairs.length && !pairs[i].left && pairs[i].right && pairs[i].right.type === 'added') {
                addedStart = i;
                while (i < pairs.length && !pairs[i].left && pairs[i].right) {
                    addedEnd = i;
                    i++;
                }

                // Mark as modifications
                const removedCount = removedEnd - removedStart + 1;
                const addedCount = addedEnd - addedStart + 1;
                const minCount = Math.min(removedCount, addedCount);

                // Pair up removed and added lines as modifications
                for (let j = 0; j < minCount; j++) {
                    const removedIdx = removedStart + j;
                    const addedIdx = addedStart + j;
                    
                    pairs[removedIdx].left.type = 'modified';
                    pairs[addedIdx].right.type = 'modified';
                    
                    // Compute character-level diff only for smaller files
                    if (this.enableCharDiff) {
                        const charDiff = this.computeCharDiff(
                            pairs[removedIdx].left.content,
                            pairs[addedIdx].right.type === 'modified' ? pairs[addedIdx].right.content : ''
                        );
                        pairs[removedIdx].left.charDiff = charDiff.left;
                        pairs[addedIdx].right.charDiff = charDiff.right;
                    }

                    // Merge into single pair for side-by-side
                    pairs[removedIdx].right = pairs[addedIdx].right;
                    pairs[addedIdx].merged = true;
                }
            } else if (removedStart === -1) {
                i++;
            }
        }

        // Remove merged pairs
        result.pairs = pairs.filter(p => !p.merged);
    }

    /**
     * Compute character-level differences between two lines
     * @param {string} leftLine 
     * @param {string} rightLine 
     * @returns {Object} Character diff for both sides
     */
    computeCharDiff(leftLine, rightLine) {
        const diff = Diff.diffChars(leftLine, rightLine);
        
        const leftParts = [];
        const rightParts = [];

        diff.forEach((part) => {
            if (part.added) {
                rightParts.push({
                    text: part.value,
                    type: 'added'
                });
            } else if (part.removed) {
                leftParts.push({
                    text: part.value,
                    type: 'removed'
                });
            } else {
                leftParts.push({
                    text: part.value,
                    type: 'unchanged'
                });
                rightParts.push({
                    text: part.value,
                    type: 'unchanged'
                });
            }
        });

        return { left: leftParts, right: rightParts };
    }

    /**
     * Group consecutive diff lines into blocks
     * @param {Object} diffResult 
     * @returns {Array} Array of diff blocks
     */
    groupDiffBlocks(diffResult) {
        const blocks = [];
        let currentBlock = null;

        diffResult.pairs.forEach((pair, index) => {
            const isDiff = (pair.left && pair.left.type !== 'unchanged') ||
                          (pair.right && pair.right.type !== 'unchanged');

            if (isDiff) {
                if (!currentBlock) {
                    currentBlock = {
                        startIndex: index,
                        endIndex: index,
                        pairs: []
                    };
                }
                currentBlock.endIndex = index;
                currentBlock.pairs.push(pair);
            } else {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
            }
        });

        if (currentBlock) {
            blocks.push(currentBlock);
        }

        return blocks;
    }

    /**
     * Get diff statistics
     * @returns {Object} Statistics about the diff
     */
    getStats() {
        let added = 0;
        let removed = 0;
        let modified = 0;
        let unchanged = 0;

        this.diffResult.pairs.forEach(pair => {
            if (pair.left && pair.right) {
                if (pair.left.type === 'modified') {
                    modified++;
                } else {
                    unchanged++;
                }
            } else if (pair.left) {
                removed++;
            } else if (pair.right) {
                added++;
            }
        });

        return {
            added,
            removed,
            modified,
            unchanged,
            totalDiffs: this.diffBlocks.length,
            leftLines: this.leftLines.length,
            rightLines: this.rightLines.length
        };
    }

    /**
     * Get the diff blocks for navigation
     * @returns {Array} Diff blocks
     */
    getDiffBlocks() {
        return this.diffBlocks;
    }

    /**
     * Get the full diff result
     * @returns {Object} Diff result
     */
    getResult() {
        return this.diffResult;
    }
}

// Export for use in other modules
window.DiffEngine = DiffEngine;
