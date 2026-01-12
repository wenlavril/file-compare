/**
 * Syntax Highlighting Module
 * Wrapper around highlight.js for code syntax highlighting
 */

class SyntaxHighlighter {
    constructor() {
        this.languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'rb': 'ruby',
            'yml': 'yaml',
            'md': 'markdown',
            'sh': 'bash',
            'zsh': 'bash',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'vue': 'xml',
            'svelte': 'xml'
        };
    }

    /**
     * Initialize highlight.js
     */
    init() {
        if (typeof hljs !== 'undefined') {
            // Configure highlight.js
            hljs.configure({
                ignoreUnescapedHTML: true,
                throwUnescapedHTML: false
            });
        }
    }

    /**
     * Detect language from filename
     * @param {string} filename 
     * @returns {string|null} Detected language
     */
    detectLanguage(filename) {
        if (!filename) return null;
        
        const ext = filename.split('.').pop().toLowerCase();
        return this.languageMap[ext] || ext;
    }

    /**
     * Highlight a single line of code
     * @param {string} code - Code to highlight
     * @param {string} language - Language for highlighting
     * @returns {string} Highlighted HTML
     */
    highlightLine(code, language) {
        if (!code || typeof hljs === 'undefined') {
            return this.escapeHtml(code);
        }

        try {
            if (language && hljs.getLanguage(language)) {
                const result = hljs.highlight(code, { language });
                return result.value;
            } else {
                const result = hljs.highlightAuto(code);
                return result.value;
            }
        } catch (e) {
            console.warn('Highlight error:', e);
            return this.escapeHtml(code);
        }
    }

    /**
     * Highlight code with diff information preserved
     * @param {string} code - Code content
     * @param {Array} charDiff - Character-level diff info
     * @param {string} language - Language for highlighting
     * @returns {string} Highlighted HTML with diff markers
     */
    highlightWithDiff(code, charDiff, language) {
        if (!charDiff || charDiff.length === 0) {
            return this.highlightLine(code, language);
        }

        // Build the highlighted content with diff markers
        let result = '';
        charDiff.forEach(part => {
            const highlighted = this.escapeHtml(part.text);
            if (part.type === 'added') {
                result += `<span class="diff-char-added">${highlighted}</span>`;
            } else if (part.type === 'removed') {
                result += `<span class="diff-char-removed">${highlighted}</span>`;
            } else {
                result += highlighted;
            }
        });

        return result;
    }

    /**
     * Escape HTML special characters
     * @param {string} text 
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get list of supported languages
     * @returns {Array} List of language names
     */
    getSupportedLanguages() {
        if (typeof hljs === 'undefined') return [];
        return hljs.listLanguages();
    }
}

// Export for use in other modules
window.SyntaxHighlighter = SyntaxHighlighter;
