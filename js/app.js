/**
 * File Compare Tool - Main Application
 * Integrates all modules and handles UI interactions
 */

class FileCompareApp {
    constructor() {
        // Initialize modules
        this.diffEngine = new DiffEngine();
        this.syntaxHighlighter = new SyntaxHighlighter();
        this.folderCompare = new FolderCompare();

        // Initialize diff engine
        window.diffEngine = this.diffEngine;

        // State
        this.currentMode = 'text'; // 'text' or 'folder'
        this.currentFilter = 'all'; // 'all', 'diff', 'same'
        this.syncScroll = true;
        this.currentDiffIndex = -1;
        this.leftLanguage = null;
        this.rightLanguage = null;

        // DOM Elements
        this.elements = {};
        
        // Performance: debounce timer
        this.debounceTimer = null;
        this.debounceDelay = 16; // ms - nearly instant (one frame)
        this.isProcessing = false;
        
        // Virtualization settings
        this.visibleLineBuffer = 50; // Extra lines to render above/below viewport
        this.lineHeight = 20;
        
        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.syntaxHighlighter.init();
        
        // Start with empty content - no demo content on page load
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Mode buttons
            modeButtons: document.querySelectorAll('[data-mode]'),
            filterButtons: document.querySelectorAll('[data-filter]'),
            
            // Views
            textCompareView: document.getElementById('textCompareView'),
            folderCompareView: document.getElementById('folderCompareView'),
            
            // Text compare elements - input layer (textarea)
            leftInput: document.getElementById('leftInput'),
            rightInput: document.getElementById('rightInput'),
            // Display layer (for diff rendering)
            leftDisplay: document.getElementById('leftDisplay'),
            rightDisplay: document.getElementById('rightDisplay'),
            // Line numbers
            leftLineNumbers: document.getElementById('leftLineNumbers'),
            rightLineNumbers: document.getElementById('rightLineNumbers'),
            // File path inputs
            leftFilePath: document.getElementById('leftFilePath'),
            rightFilePath: document.getElementById('rightFilePath'),
            leftBrowse: document.getElementById('leftBrowse'),
            rightBrowse: document.getElementById('rightBrowse'),
            leftFileInput: document.getElementById('leftFileInput'),
            rightFileInput: document.getElementById('rightFileInput'),
            
            // Folder compare elements
            leftFolderPath: document.getElementById('leftFolderPath'),
            rightFolderPath: document.getElementById('rightFolderPath'),
            leftFolderBrowse: document.getElementById('leftFolderBrowse'),
            rightFolderBrowse: document.getElementById('rightFolderBrowse'),
            leftFolderTree: document.getElementById('leftFolderTree'),
            rightFolderTree: document.getElementById('rightFolderTree'),
            
            // Navigation
            prevDiff: document.getElementById('prevDiff'),
            nextDiff: document.getElementById('nextDiff'),
            
            // Actions
            copyLeft: document.getElementById('copyLeft'),
            swapSides: document.getElementById('swapSides'),
            exportResult: document.getElementById('exportResult'),
            
            // Divider
            mainDivider: document.getElementById('mainDivider'),
            
            // Status
            diffCount: document.getElementById('diffCount'),
            lineCount: document.getElementById('lineCount'),
            syncStatus: document.getElementById('syncStatus')
        };
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Mode switching
        this.elements.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
        });

        // Filter switching
        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });

        // Text input changes with debouncing - use textarea
        this.elements.leftInput.addEventListener('input', () => this.onTextChangeDebounced());
        this.elements.rightInput.addEventListener('input', () => this.onTextChangeDebounced());

        // Handle drop events on textarea
        this.elements.leftInput.addEventListener('drop', (e) => this.handleDrop(e, 'left'));
        this.elements.rightInput.addEventListener('drop', (e) => this.handleDrop(e, 'right'));
        
        // Drag over visual feedback
        this.elements.leftInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.target.classList.add('drag-over');
        });
        this.elements.rightInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.target.classList.add('drag-over');
        });
        this.elements.leftInput.addEventListener('dragleave', (e) => {
            e.target.classList.remove('drag-over');
        });
        this.elements.rightInput.addEventListener('dragleave', (e) => {
            e.target.classList.remove('drag-over');
        });

        // File browsing
        this.elements.leftBrowse.addEventListener('click', () => this.elements.leftFileInput.click());
        this.elements.rightBrowse.addEventListener('click', () => this.elements.rightFileInput.click());
        this.elements.leftFileInput.addEventListener('change', (e) => this.loadFile(e, 'left'));
        this.elements.rightFileInput.addEventListener('change', (e) => this.loadFile(e, 'right'));

        // Folder browsing
        this.elements.leftFolderBrowse.addEventListener('click', () => this.pickFolder('left'));
        this.elements.rightFolderBrowse.addEventListener('click', () => this.pickFolder('right'));

        // Navigation
        this.elements.prevDiff.addEventListener('click', () => this.navigateDiff(-1));
        this.elements.nextDiff.addEventListener('click', () => this.navigateDiff(1));

        // Actions
        this.elements.swapSides.addEventListener('click', () => this.swapSides());
        this.elements.exportResult.addEventListener('click', () => this.exportResult());

        // Sync scroll - bind to textarea input elements
        this.elements.leftInput.addEventListener('scroll', (e) => this.onScroll(e, 'left'));
        this.elements.rightInput.addEventListener('scroll', (e) => this.onScroll(e, 'right'));

        // Status bar click to toggle sync
        this.elements.syncStatus.addEventListener('click', () => this.toggleSyncScroll());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Line selection on click - use mouse position to calculate pair index
        this.elements.leftInput.addEventListener('click', (e) => this.handleEditorClick(e, 'left'));
        this.elements.rightInput.addEventListener('click', (e) => this.handleEditorClick(e, 'right'));
        
        // Track text selection changes to highlight corresponding display lines
        this.elements.leftInput.addEventListener('select', () => this.handleSelectionChange('left'));
        this.elements.rightInput.addEventListener('select', () => this.handleSelectionChange('right'));
        
        // Also track mouseup for selection end
        this.elements.leftInput.addEventListener('mouseup', () => setTimeout(() => this.handleSelectionChange('left'), 10));
        this.elements.rightInput.addEventListener('mouseup', () => setTimeout(() => this.handleSelectionChange('right'), 10));
        
        // Also handle line number clicks
        this.elements.leftLineNumbers.addEventListener('click', (e) => this.handleLineNumClick(e, 'left'));
        this.elements.rightLineNumbers.addEventListener('click', (e) => this.handleLineNumClick(e, 'right'));
    }
    
    /**
     * Handle text selection changes in the textarea
     * Highlights corresponding lines in the display layer
     * @param {string} side 
     */
    handleSelectionChange(side) {
        const textarea = side === 'left' ? this.elements.leftInput : this.elements.rightInput;
        const display = side === 'left' ? this.elements.leftDisplay : this.elements.rightDisplay;
        const lineNums = side === 'left' ? this.elements.leftLineNumbers : this.elements.rightLineNumbers;
        
        // Remove previous selection highlights
        display.querySelectorAll('.code-line.selected').forEach(el => el.classList.remove('selected'));
        lineNums.querySelectorAll('.line-num.selected').forEach(el => el.classList.remove('selected'));
        
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        
        if (selStart === selEnd) {
            return; // No selection
        }
        
        // Calculate which lines in the textarea are selected
        const text = textarea.value;
        const textBefore = text.substring(0, selStart);
        const textSelected = text.substring(selStart, selEnd);
        
        const startLineInTextarea = textBefore.split('\n').length - 1;
        const selectedLineCount = textSelected.split('\n').length;
        const endLineInTextarea = startLineInTextarea + selectedLineCount - 1;
        
        // Map textarea lines to pair indices
        const result = this.diffEngine.getResult();
        if (!result || !result.pairs) return;
        
        let textareaLineNum = 0;
        for (let i = 0; i < result.pairs.length; i++) {
            const pair = result.pairs[i];
            const sideData = side === 'left' ? pair.left : pair.right;
            
            if (sideData) {
                // This pair has content on this side
                if (textareaLineNum >= startLineInTextarea && textareaLineNum <= endLineInTextarea) {
                    // This line is selected, highlight it
                    const line = display.querySelector(`[data-index="${i}"]`);
                    const lineNum = lineNums.querySelectorAll('.line-num')[i];
                    if (line) line.classList.add('selected');
                    if (lineNum) lineNum.classList.add('selected');
                }
                textareaLineNum++;
            }
            
            if (textareaLineNum > endLineInTextarea) break;
        }
    }

    /**
     * Handle editor click for line selection
     * Calculates pair index from mouse Y position relative to the visible content
     * @param {MouseEvent} e 
     * @param {string} side 
     */
    handleEditorClick(e, side) {
        const textarea = e.target;
        
        // Don't interfere with text selection - only select line if no text is selected after click
        setTimeout(() => {
            if (textarea.selectionStart !== textarea.selectionEnd) {
                return; // User is selecting text
            }
            
            // Calculate the pair index from the click position
            const rect = textarea.getBoundingClientRect();
            const scrollTop = textarea.scrollTop;
            const padding = 8; // Top padding of the textarea
            const clickY = e.clientY - rect.top + scrollTop - padding;
            
            // Each line is 20px high
            const lineHeight = 20;
            const pairIndex = Math.floor(clickY / lineHeight);
            
            // Get total pairs count
            const result = this.diffEngine.getResult();
            if (!result || !result.pairs) return;
            
            if (pairIndex >= 0 && pairIndex < result.pairs.length) {
                this.selectLineByPairIndex(pairIndex);
            }
        }, 0);
    }

    /**
     * Handle line number click
     * @param {MouseEvent} e 
     * @param {string} side 
     */
    handleLineNumClick(e, side) {
        const lineNum = e.target.closest('.line-num');
        if (!lineNum) return;
        
        const lineNums = Array.from(this.elements[`${side}LineNumbers`].querySelectorAll('.line-num'));
        const pairIndex = lineNums.indexOf(lineNum);
        
        if (pairIndex >= 0) {
            this.selectLineByPairIndex(pairIndex);
        }
    }

    /**
     * Select a line directly by pair index
     * @param {number} pairIndex 
     */
    selectLineByPairIndex(pairIndex) {
        if (pairIndex < 0) return;
        
        // Remove previous selection
        document.querySelectorAll('.code-line.selected').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelectorAll('.line-num.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Select the line at this pair index on both sides
        const leftLine = this.elements.leftDisplay.querySelector(`[data-index="${pairIndex}"]`);
        const rightLine = this.elements.rightDisplay.querySelector(`[data-index="${pairIndex}"]`);
        
        if (leftLine) leftLine.classList.add('selected');
        if (rightLine) rightLine.classList.add('selected');

        // Also highlight corresponding line numbers
        const leftNums = this.elements.leftLineNumbers.querySelectorAll('.line-num');
        const rightNums = this.elements.rightLineNumbers.querySelectorAll('.line-num');
        
        if (leftNums[pairIndex]) leftNums[pairIndex].classList.add('selected');
        if (rightNums[pairIndex]) rightNums[pairIndex].classList.add('selected');

        // Store selected index
        this.selectedLineIndex = pairIndex;
    }

    /**
     * Set demo content for initial display
     */
    setDemoContent() {
        const leftDemo = `function greet(name) {
    console.log("Hello, " + name);
    return true;
}

const users = ["Alice", "Bob", "Charlie"];

for (let user of users) {
    greet(user);
}

// Old comment
const VERSION = "1.0.0";`;

        const rightDemo = `function greet(name, greeting = "Hello") {
    console.log(greeting + ", " + name + "!");
    return true;
}

const users = ["Alice", "Bob", "David"];

for (const user of users) {
    greet(user, "Hi");
}

// New comment with update
const VERSION = "2.0.0";
const BUILD = 1234;`;

        this.elements.leftInput.value = leftDemo;
        this.elements.rightInput.value = rightDemo;
        this.elements.leftFilePath.value = 'demo-old.js';
        this.elements.rightFilePath.value = 'demo-new.js';
        this.leftLanguage = 'javascript';
        this.rightLanguage = 'javascript';

        // Trigger comparison immediately (not debounced for demo)
        this.onTextChange();
    }

    /**
     * Clear editor content
     * @param {string} side 
     */
    clearContent(side) {
        const inputEl = side === 'left' ? this.elements.leftInput : this.elements.rightInput;
        const pathInput = side === 'left' ? this.elements.leftFilePath : this.elements.rightFilePath;
        
        inputEl.value = '';
        pathInput.value = '';
        
        if (side === 'left') {
            this.leftLanguage = null;
        } else {
            this.rightLanguage = null;
        }
        
        this.onTextChangeDebounced();
    }

    /**
     * Switch between text and folder comparison modes
     * @param {string} mode 
     */
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update button states
        this.elements.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Show/hide views
        this.elements.textCompareView.classList.toggle('active', mode === 'text');
        this.elements.folderCompareView.classList.toggle('active', mode === 'folder');
    }

    /**
     * Set the current filter
     * @param {string} filter 
     */
    setFilter(filter) {
        this.currentFilter = filter;
        
        this.elements.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Re-render with filter
        this.renderDiff();
    }

    /**
     * Handle drop event for files
     * @param {DragEvent} e 
     * @param {string} side 
     */
    async handleDrop(e, side) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        const inputEl = side === 'left' ? this.elements.leftInput : this.elements.rightInput;
        
        const files = e.dataTransfer.files;
        if (files.length === 0) {
            // If no files, check for text data
            const text = e.dataTransfer.getData('text/plain');
            if (text) {
                inputEl.value = text;
                this.onTextChangeDebounced();
            }
            return;
        }
        
        const file = files[0];
        
        // Check if it's a text file
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('文件太大，请选择小于 10MB 的文件');
            return;
        }
        
        this.showLoading(side);
        
        try {
            const content = await file.text();
            const pathInput = side === 'left' ? this.elements.leftFilePath : this.elements.rightFilePath;
            
            inputEl.value = content;
            pathInput.value = file.name;
            
            // Detect language
            const language = this.syntaxHighlighter.detectLanguage(file.name);
            if (side === 'left') {
                this.leftLanguage = language;
            } else {
                this.rightLanguage = language;
            }
            
            this.onTextChangeDebounced();
        } catch (err) {
            console.error('Error reading file:', err);
            alert('读取文件失败');
        } finally {
            this.hideLoading(side);
        }
    }

    /**
     * Show loading indicator
     * @param {string} side 
     */
    showLoading(side) {
        const panel = side === 'left' 
            ? this.elements.leftInput.closest('.panel')
            : this.elements.rightInput.closest('.panel');
        panel.classList.add('loading');
        this.elements[`${side}Input`].style.opacity = '0.5';
    }

    /**
     * Hide loading indicator
     * @param {string} side 
     */
    hideLoading(side) {
        const panel = side === 'left' 
            ? this.elements.leftInput.closest('.panel')
            : this.elements.rightInput.closest('.panel');
        panel.classList.remove('loading');
        this.elements[`${side}Input`].style.opacity = '1';
    }

    /**
     * Debounced text change handler
     */
    onTextChangeDebounced() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.onTextChange();
        }, this.debounceDelay);
    }

    /**
     * Handle text content changes
     */
    onTextChange() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        // Reset navigation index for new comparison
        this.currentDiffIndex = -1;
        
        // Read from textarea inputs
        const leftText = this.elements.leftInput.value || '';
        const rightText = this.elements.rightInput.value || '';

        // Use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
            // Perform diff
            this.diffEngine.compare(leftText, rightText);
            // Render with optimization
            this.renderDiffOptimized();
            this.updateStats();
            
            this.isProcessing = false;
        });
    }

    /**
     * Render the diff result (basic version)
     */
    renderDiff() {
        this.renderDiffOptimized();
    }

    /**
     * Optimized diff rendering for large files
     * Uses document fragment and chunked rendering
     */
    renderDiffOptimized() {
        const result = this.diffEngine.getResult();
        
        // Handle empty content - clear the display
        if (!result || !result.pairs || result.pairs.length === 0) {
            this.elements.leftDisplay.innerHTML = '';
            this.elements.rightDisplay.innerHTML = '';
            this.elements.leftLineNumbers.innerHTML = '';
            this.elements.rightLineNumbers.innerHTML = '';
            return;
        }

        const pairs = result.pairs.filter(pair => this.shouldShowPair(pair));
        const totalLines = pairs.length;
        
        // Handle filtered empty result
        if (totalLines === 0) {
            this.elements.leftDisplay.innerHTML = '<span class="code-line" style="color: var(--text-muted);">没有匹配的内容</span>';
            this.elements.rightDisplay.innerHTML = '<span class="code-line" style="color: var(--text-muted);">没有匹配的内容</span>';
            this.elements.leftLineNumbers.innerHTML = '';
            this.elements.rightLineNumbers.innerHTML = '';
            return;
        }
        
        // For small files, render directly
        if (totalLines < 1000) {
            this.renderDiffDirect(pairs);
            return;
        }

        // For large files, use chunked rendering
        this.renderDiffChunked(pairs);
    }

    /**
     * Direct rendering for small files
     * @param {Array} pairs 
     */
    renderDiffDirect(pairs) {
        const leftFragment = document.createDocumentFragment();
        const rightFragment = document.createDocumentFragment();
        const leftNumsFragment = document.createDocumentFragment();
        const rightNumsFragment = document.createDocumentFragment();

        // Disable syntax highlighting for large content to improve performance
        const enableSyntax = pairs.length < 500;

        pairs.forEach((pair, index) => {
            // Left side
            const leftLine = document.createElement('span');
            leftLine.className = 'code-line';
            leftLine.dataset.index = index;
            
            const leftNum = document.createElement('span');
            leftNum.className = 'line-num';
            
            if (pair.left) {
                const lineClass = this.getLineClass(pair.left.type);
                if (lineClass) {
                    leftLine.classList.add(lineClass);
                    leftNum.classList.add(lineClass);
                }
                
                if (enableSyntax && pair.left.charDiff) {
                    leftLine.innerHTML = this.syntaxHighlighter.highlightWithDiff(
                        pair.left.content, pair.left.charDiff, this.leftLanguage
                    );
                } else {
                    leftLine.textContent = pair.left.content || ' ';
                }
                leftNum.textContent = pair.left.lineNum;
            } else {
                leftLine.classList.add('diff-removed');
                leftLine.innerHTML = '&nbsp;';
                leftNum.classList.add('diff-removed');
                leftNum.textContent = '-';
            }
            
            leftFragment.appendChild(leftLine);
            leftNumsFragment.appendChild(leftNum);

            // Right side
            const rightLine = document.createElement('span');
            rightLine.className = 'code-line';
            rightLine.dataset.index = index;
            
            const rightNum = document.createElement('span');
            rightNum.className = 'line-num';
            
            if (pair.right) {
                const lineClass = this.getLineClass(pair.right.type);
                if (lineClass) {
                    rightLine.classList.add(lineClass);
                    rightNum.classList.add(lineClass);
                }
                
                if (enableSyntax && pair.right.charDiff) {
                    rightLine.innerHTML = this.syntaxHighlighter.highlightWithDiff(
                        pair.right.content, pair.right.charDiff, this.rightLanguage
                    );
                } else {
                    rightLine.textContent = pair.right.content || ' ';
                }
                rightNum.textContent = pair.right.lineNum;
            } else {
                rightLine.classList.add('diff-added');
                rightLine.innerHTML = '&nbsp;';
                rightNum.classList.add('diff-added');
                rightNum.textContent = '+';
            }
            
            rightFragment.appendChild(rightLine);
            rightNumsFragment.appendChild(rightNum);
        });

        // Clear and update DOM in one operation
        this.elements.leftDisplay.innerHTML = '';
        this.elements.rightDisplay.innerHTML = '';
        this.elements.leftLineNumbers.innerHTML = '';
        this.elements.rightLineNumbers.innerHTML = '';
        
        this.elements.leftDisplay.appendChild(leftFragment);
        this.elements.rightDisplay.appendChild(rightFragment);
        this.elements.leftLineNumbers.appendChild(leftNumsFragment);
        this.elements.rightLineNumbers.appendChild(rightNumsFragment);
    }

    /**
     * Chunked rendering for large files
     * @param {Array} pairs 
     */
    renderDiffChunked(pairs) {
        const chunkSize = 500;
        let currentChunk = 0;
        
        // Clear display first
        this.elements.leftDisplay.innerHTML = '';
        this.elements.rightDisplay.innerHTML = '';
        this.elements.leftLineNumbers.innerHTML = '';
        this.elements.rightLineNumbers.innerHTML = '';
        
        // Show progress indicator
        this.elements.diffCount.textContent = '正在渲染...';

        const renderChunk = () => {
            const startIdx = currentChunk * chunkSize;
            const endIdx = Math.min(startIdx + chunkSize, pairs.length);
            
            if (startIdx >= pairs.length) {
                // Done rendering
                this.updateStats();
                return;
            }

            const leftFragment = document.createDocumentFragment();
            const rightFragment = document.createDocumentFragment();
            const leftNumsFragment = document.createDocumentFragment();
            const rightNumsFragment = document.createDocumentFragment();

            for (let i = startIdx; i < endIdx; i++) {
                const pair = pairs[i];
                
                // Left side
                const leftLine = document.createElement('span');
                leftLine.className = 'code-line';
                leftLine.dataset.index = i;
                
                const leftNum = document.createElement('span');
                leftNum.className = 'line-num';
                
                if (pair.left) {
                    const lineClass = this.getLineClass(pair.left.type);
                    if (lineClass) {
                        leftLine.classList.add(lineClass);
                        leftNum.classList.add(lineClass);
                    }
                    leftLine.textContent = pair.left.content || ' ';
                    leftNum.textContent = pair.left.lineNum;
                } else {
                    leftLine.classList.add('diff-removed');
                    leftLine.innerHTML = '&nbsp;';
                    leftNum.classList.add('diff-removed');
                    leftNum.textContent = '-';
                }
                
                leftFragment.appendChild(leftLine);
                leftNumsFragment.appendChild(leftNum);

                // Right side
                const rightLine = document.createElement('span');
                rightLine.className = 'code-line';
                rightLine.dataset.index = i;
                
                const rightNum = document.createElement('span');
                rightNum.className = 'line-num';
                
                if (pair.right) {
                    const lineClass = this.getLineClass(pair.right.type);
                    if (lineClass) {
                        rightLine.classList.add(lineClass);
                        rightNum.classList.add(lineClass);
                    }
                    rightLine.textContent = pair.right.content || ' ';
                    rightNum.textContent = pair.right.lineNum;
                } else {
                    rightLine.classList.add('diff-added');
                    rightLine.innerHTML = '&nbsp;';
                    rightNum.classList.add('diff-added');
                    rightNum.textContent = '+';
                }
                
                rightFragment.appendChild(rightLine);
                rightNumsFragment.appendChild(rightNum);
            }

            this.elements.leftDisplay.appendChild(leftFragment);
            this.elements.rightDisplay.appendChild(rightFragment);
            this.elements.leftLineNumbers.appendChild(leftNumsFragment);
            this.elements.rightLineNumbers.appendChild(rightNumsFragment);

            currentChunk++;
            
            // Update progress
            const progress = Math.min(100, Math.round((endIdx / pairs.length) * 100));
            this.elements.diffCount.textContent = `渲染中: ${progress}%`;

            // Schedule next chunk
            if (currentChunk * chunkSize < pairs.length) {
                requestAnimationFrame(renderChunk);
            } else {
                this.updateStats();
            }
        };

        requestAnimationFrame(renderChunk);
    }

    /**
     * Check if a pair should be shown based on current filter
     * @param {Object} pair 
     * @returns {boolean}
     */
    shouldShowPair(pair) {
        if (this.currentFilter === 'all') return true;
        
        const isDiff = (pair.left && pair.left.type !== 'unchanged') ||
                       (pair.right && pair.right.type !== 'unchanged') ||
                       !pair.left || !pair.right;

        if (this.currentFilter === 'diff') return isDiff;
        if (this.currentFilter === 'same') return !isDiff;
        
        return true;
    }

    /**
     * Get CSS class for line type
     * @param {string} type 
     * @returns {string}
     */
    getLineClass(type) {
        switch (type) {
            case 'added': return 'diff-added';
            case 'removed': return 'diff-removed';
            case 'modified': return 'diff-modified';
            default: return '';
        }
    }

    /**
     * Update status bar statistics
     */
    updateStats() {
        const stats = this.diffEngine.getStats();
        this.elements.diffCount.textContent = `差异: ${stats.totalDiffs} 处`;
        this.elements.lineCount.textContent = `行数: ${stats.leftLines} / ${stats.rightLines}`;
    }

    /**
     * Load file content
     * @param {Event} e 
     * @param {string} side 
     */
    async loadFile(e, side) {
        const file = e.target.files[0];
        if (!file) return;

        const content = await file.text();
        const pathInput = side === 'left' ? this.elements.leftFilePath : this.elements.rightFilePath;
        const inputEl = side === 'left' ? this.elements.leftInput : this.elements.rightInput;

        pathInput.value = file.name;
        inputEl.value = content;

        // Detect language
        const language = this.syntaxHighlighter.detectLanguage(file.name);
        if (side === 'left') {
            this.leftLanguage = language;
        } else {
            this.rightLanguage = language;
        }

        this.onTextChange();
    }

    /**
     * Pick folder for comparison
     * @param {string} side 
     */
    async pickFolder(side) {
        if (!this.folderCompare.isSupported()) {
            alert('您的浏览器不支持文件夹选择功能，请使用 Chrome 或 Edge 浏览器。');
            return;
        }

        try {
            const handle = await this.folderCompare.pickFolder();
            if (!handle) return;

            const pathInput = side === 'left' ? this.elements.leftFolderPath : this.elements.rightFolderPath;
            pathInput.value = handle.name;

            if (side === 'left') {
                await this.folderCompare.setLeftFolder(handle);
            } else {
                await this.folderCompare.setRightFolder(handle);
            }

            // If both folders are set, compare
            if (this.folderCompare.leftFolder && this.folderCompare.rightFolder) {
                this.compareFolders();
            } else {
                this.renderSingleFolderTree(side);
            }
        } catch (e) {
            console.error('Error picking folder:', e);
            alert('选择文件夹时出错: ' + e.message);
        }
    }

    /**
     * Render a single folder tree (when only one side is selected)
     * @param {string} side 
     */
    renderSingleFolderTree(side) {
        const files = side === 'left' ? this.folderCompare.leftFiles : this.folderCompare.rightFiles;
        const container = side === 'left' ? this.elements.leftFolderTree : this.elements.rightFolderTree;

        const items = [];
        for (const [path, info] of files) {
            items.push(this.renderTreeItem(info, 'pending'));
        }

        container.innerHTML = items.join('');
    }

    /**
     * Compare folders and render results
     */
    compareFolders() {
        const results = this.folderCompare.compare();
        
        this.renderFolderTree(this.elements.leftFolderTree, results, 'left');
        this.renderFolderTree(this.elements.rightFolderTree, results, 'right');

        // Update stats
        const stats = this.folderCompare.getStats();
        this.elements.diffCount.textContent = `不同: ${stats.different} | 仅左: ${stats.onlyLeft} | 仅右: ${stats.onlyRight}`;
        this.elements.lineCount.textContent = `相同: ${stats.same} 个文件`;
    }

    /**
     * Render folder comparison tree
     * @param {HTMLElement} container 
     * @param {Array} results 
     * @param {string} side 
     */
    renderFolderTree(container, results, side) {
        const items = results.map(item => {
            // For left tree, don't show items that only exist on right
            if (side === 'left' && item.status === 'only-right') {
                return this.renderTreeItem({ ...item, placeholder: true }, item.status);
            }
            // For right tree, don't show items that only exist on left
            if (side === 'right' && item.status === 'only-left') {
                return this.renderTreeItem({ ...item, placeholder: true }, item.status);
            }
            return this.renderTreeItem(item, item.status);
        });

        container.innerHTML = items.join('');

        // Bind click events for file comparison
        container.querySelectorAll('.tree-item[data-kind="file"]').forEach(el => {
            el.addEventListener('dblclick', () => this.openFileComparison(el.dataset.path));
        });
    }

    /**
     * Render a single tree item
     * @param {Object} item 
     * @param {string} status 
     * @returns {string} HTML
     */
    renderTreeItem(item, status) {
        const indent = (item.depth || 0) * 20;
        const icon = item.kind === 'directory' 
            ? '<svg class="tree-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/></svg>'
            : '<svg class="tree-item-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"/></svg>';
        
        const statusText = {
            'same': '相同',
            'different': '不同',
            'only-left': '仅左',
            'only-right': '仅右',
            'pending': ''
        };

        const opacity = item.placeholder ? 'opacity: 0.3;' : '';

        return `
            <div class="tree-item ${status}" style="padding-left: ${indent}px; ${opacity}" data-path="${item.path}" data-kind="${item.kind}">
                ${icon}
                <span class="tree-item-name">${item.name}</span>
                ${status !== 'pending' ? `<span class="tree-item-status">${statusText[status]}</span>` : ''}
            </div>
        `;
    }

    /**
     * Open file comparison for a folder item
     * @param {string} path 
     */
    async openFileComparison(path) {
        const result = this.folderCompare.getResult().find(r => r.path === path);
        if (!result || result.kind !== 'file') return;

        // Switch to text compare mode
        this.switchMode('text');

        // Load file contents
        const leftContent = result.left ? await this.folderCompare.getFileContent(result.left) : '';
        const rightContent = result.right ? await this.folderCompare.getFileContent(result.right) : '';

        this.elements.leftInput.value = leftContent;
        this.elements.rightInput.value = rightContent;
        this.elements.leftFilePath.value = result.left?.path || '';
        this.elements.rightFilePath.value = result.right?.path || '';

        // Detect languages
        this.leftLanguage = this.syntaxHighlighter.detectLanguage(result.name);
        this.rightLanguage = this.syntaxHighlighter.detectLanguage(result.name);

        this.onTextChange();
    }

    /**
     * Navigate to previous/next diff
     * @param {number} direction 
     */
    navigateDiff(direction) {
        const blocks = this.diffEngine.getDiffBlocks();
        if (blocks.length === 0) {
            console.log('No diff blocks found');
            return;
        }

        // Initialize index if it's the first navigation
        if (this.currentDiffIndex === undefined || this.currentDiffIndex < 0) {
            this.currentDiffIndex = direction > 0 ? 0 : blocks.length - 1;
        } else {
            this.currentDiffIndex += direction;
            
            if (this.currentDiffIndex < 0) {
                this.currentDiffIndex = blocks.length - 1;
            } else if (this.currentDiffIndex >= blocks.length) {
                this.currentDiffIndex = 0;
            }
        }

        const block = blocks[this.currentDiffIndex];
        console.log(`Navigating to diff block ${this.currentDiffIndex + 1}/${blocks.length}, pair index: ${block.startIndex}`);
        
        this.scrollToLine(block.startIndex);
        this.highlightCurrentBlock(block);
        
        // Update status to show current position
        this.elements.diffCount.textContent = `差异: ${this.currentDiffIndex + 1}/${blocks.length}`;
    }

    /**
     * Highlight the current diff block
     * @param {Object} block 
     */
    highlightCurrentBlock(block) {
        // Remove previous highlights
        document.querySelectorAll('.code-line.current-diff').forEach(el => {
            el.classList.remove('current-diff');
        });

        // Add highlight to current block lines
        for (let i = block.startIndex; i <= block.endIndex; i++) {
            const leftLine = this.elements.leftDisplay.querySelector(`[data-index="${i}"]`);
            const rightLine = this.elements.rightDisplay.querySelector(`[data-index="${i}"]`);
            
            if (leftLine) leftLine.classList.add('current-diff');
            if (rightLine) rightLine.classList.add('current-diff');
        }

        // Clear highlight after 2 seconds
        setTimeout(() => {
            document.querySelectorAll('.code-line.current-diff').forEach(el => {
                el.classList.remove('current-diff');
            });
        }, 2000);
    }

    /**
     * Scroll to a specific line
     * @param {number} lineIndex 
     */
    scrollToLine(lineIndex) {
        // Find the line element and scroll it into view
        const leftLine = this.elements.leftDisplay.querySelector(`[data-index="${lineIndex}"]`);
        const rightLine = this.elements.rightDisplay.querySelector(`[data-index="${lineIndex}"]`);
        
        if (leftLine) {
            // Calculate the scroll position based on the element's actual position
            const lineTop = leftLine.offsetTop;
            const containerHeight = this.elements.leftInput.clientHeight;
            // Center the line in the viewport
            const scrollTop = Math.max(0, lineTop - containerHeight / 3);
            
            this.elements.leftInput.scrollTop = scrollTop;
            this.elements.rightInput.scrollTop = scrollTop;
            
            // Update line numbers and display position
            this.elements.leftLineNumbers.style.transform = `translateY(-${scrollTop}px)`;
            this.elements.rightLineNumbers.style.transform = `translateY(-${scrollTop}px)`;
            this.elements.leftDisplay.style.transform = `translateY(-${scrollTop}px)`;
            this.elements.rightDisplay.style.transform = `translateY(-${scrollTop}px)`;
        } else {
            // Fallback to calculated position if element not found
            const lineHeight = 20;
            const scrollTop = lineIndex * lineHeight;
            
            this.elements.leftInput.scrollTop = scrollTop;
            this.elements.rightInput.scrollTop = scrollTop;
            
            this.elements.leftLineNumbers.style.transform = `translateY(-${scrollTop}px)`;
            this.elements.rightLineNumbers.style.transform = `translateY(-${scrollTop}px)`;
            this.elements.leftDisplay.style.transform = `translateY(-${scrollTop}px)`;
            this.elements.rightDisplay.style.transform = `translateY(-${scrollTop}px)`;
        }
    }

    /**
     * Handle scroll sync
     * @param {Event} e 
     * @param {string} side 
     */
    onScroll(e, side) {
        const scrollTop = e.target.scrollTop;
        const scrollLeft = e.target.scrollLeft;
        
        // Sync line numbers and display with input scroll
        const lineNumEl = side === 'left' 
            ? this.elements.leftLineNumbers 
            : this.elements.rightLineNumbers;
        const displayEl = side === 'left'
            ? this.elements.leftDisplay
            : this.elements.rightDisplay;
            
        lineNumEl.style.transform = `translateY(-${scrollTop}px)`;
        displayEl.style.transform = `translate(-${scrollLeft}px, -${scrollTop}px)`;
        
        if (!this.syncScroll) return;
        
        const otherInput = side === 'left' 
            ? this.elements.rightInput 
            : this.elements.leftInput;
        const otherLineNumEl = side === 'left' 
            ? this.elements.rightLineNumbers 
            : this.elements.leftLineNumbers;
        const otherDisplayEl = side === 'left'
            ? this.elements.rightDisplay
            : this.elements.leftDisplay;
        
        // Prevent infinite scroll loop
        if (Math.abs(otherInput.scrollTop - scrollTop) > 1) {
            otherInput.scrollTop = scrollTop;
        }
        if (Math.abs(otherInput.scrollLeft - scrollLeft) > 1) {
            otherInput.scrollLeft = scrollLeft;
        }
        
        // Sync the other side's line numbers and display too
        otherLineNumEl.style.transform = `translateY(-${scrollTop}px)`;
        otherDisplayEl.style.transform = `translate(-${scrollLeft}px, -${scrollTop}px)`;
    }

    /**
     * Toggle sync scroll
     */
    toggleSyncScroll() {
        this.syncScroll = !this.syncScroll;
        this.elements.syncStatus.textContent = `同步滚动: ${this.syncScroll ? '开启' : '关闭'}`;
    }

    /**
     * Swap left and right content
     */
    swapSides() {
        const leftText = this.elements.leftInput.value;
        const rightText = this.elements.rightInput.value;
        const leftPath = this.elements.leftFilePath.value;
        const rightPath = this.elements.rightFilePath.value;

        this.elements.leftInput.value = rightText;
        this.elements.rightInput.value = leftText;
        this.elements.leftFilePath.value = rightPath;
        this.elements.rightFilePath.value = leftPath;

        // Swap languages
        [this.leftLanguage, this.rightLanguage] = [this.rightLanguage, this.leftLanguage];

        this.onTextChange();
    }

    /**
     * Export comparison result
     */
    exportResult() {
        const leftText = this.elements.leftInput.value;
        const rightText = this.elements.rightInput.value;

        // Create a unified diff format
        const diff = Diff.createTwoFilesPatch(
            this.elements.leftFilePath.value || 'left',
            this.elements.rightFilePath.value || 'right',
            leftText,
            rightText
        );

        // Download as file
        const blob = new Blob([diff], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diff-result.patch';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e 
     */
    handleKeyboard(e) {
        // Ctrl/Cmd + Up: Previous diff
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateDiff(-1);
        }
        // Ctrl/Cmd + Down: Next diff
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateDiff(1);
        }
        // Ctrl/Cmd + S: Export
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.exportResult();
        }
        // F7: Previous diff (like Beyond Compare)
        if (e.key === 'F7') {
            e.preventDefault();
            this.navigateDiff(-1);
        }
        // F8: Next diff (like Beyond Compare)
        if (e.key === 'F8') {
            e.preventDefault();
            this.navigateDiff(1);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FileCompareApp();
});
