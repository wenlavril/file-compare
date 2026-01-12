/**
 * Folder Compare Module
 * Uses File System Access API to compare directory structures
 */

class FolderCompare {
    constructor() {
        this.leftFolder = null;
        this.rightFolder = null;
        this.leftFiles = new Map();
        this.rightFiles = new Map();
        this.comparisonResult = [];
    }

    /**
     * Check if File System Access API is supported
     * @returns {boolean}
     */
    isSupported() {
        return 'showDirectoryPicker' in window;
    }

    /**
     * Open folder picker dialog
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
    async pickFolder() {
        if (!this.isSupported()) {
            throw new Error('File System Access API is not supported in this browser.');
        }
        
        try {
            const handle = await window.showDirectoryPicker({
                mode: 'read'
            });
            return handle;
        } catch (e) {
            if (e.name === 'AbortError') {
                return null; // User cancelled
            }
            throw e;
        }
    }

    /**
     * Set the left folder for comparison
     * @param {FileSystemDirectoryHandle} handle 
     */
    async setLeftFolder(handle) {
        this.leftFolder = handle;
        this.leftFiles = await this.scanFolder(handle, '');
    }

    /**
     * Set the right folder for comparison
     * @param {FileSystemDirectoryHandle} handle 
     */
    async setRightFolder(handle) {
        this.rightFolder = handle;
        this.rightFiles = await this.scanFolder(handle, '');
    }

    /**
     * Recursively scan a folder and return file structure
     * @param {FileSystemDirectoryHandle} handle 
     * @param {string} path 
     * @returns {Promise<Map>} Map of path -> file info
     */
    async scanFolder(handle, path) {
        const files = new Map();
        
        try {
            for await (const entry of handle.values()) {
                const entryPath = path ? `${path}/${entry.name}` : entry.name;
                
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    files.set(entryPath, {
                        name: entry.name,
                        path: entryPath,
                        kind: 'file',
                        size: file.size,
                        lastModified: file.lastModified,
                        handle: entry
                    });
                } else if (entry.kind === 'directory') {
                    files.set(entryPath, {
                        name: entry.name,
                        path: entryPath,
                        kind: 'directory',
                        handle: entry
                    });
                    
                    // Recursively scan subdirectory
                    const subFiles = await this.scanFolder(entry, entryPath);
                    for (const [subPath, subInfo] of subFiles) {
                        files.set(subPath, subInfo);
                    }
                }
            }
        } catch (e) {
            console.error('Error scanning folder:', e);
        }

        return files;
    }

    /**
     * Compare the two folders
     * @returns {Array} Comparison results
     */
    compare() {
        const results = [];
        const allPaths = new Set([...this.leftFiles.keys(), ...this.rightFiles.keys()]);
        
        // Sort paths for consistent display
        const sortedPaths = Array.from(allPaths).sort((a, b) => {
            // Directories first, then files
            const aIsDir = this.leftFiles.get(a)?.kind === 'directory' || 
                          this.rightFiles.get(a)?.kind === 'directory';
            const bIsDir = this.leftFiles.get(b)?.kind === 'directory' || 
                          this.rightFiles.get(b)?.kind === 'directory';
            
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

        for (const path of sortedPaths) {
            const leftFile = this.leftFiles.get(path);
            const rightFile = this.rightFiles.get(path);

            let status;
            if (leftFile && rightFile) {
                // Both sides have the file
                if (leftFile.kind === 'directory' && rightFile.kind === 'directory') {
                    status = 'same'; // Directories are considered same if they exist on both sides
                } else if (leftFile.size === rightFile.size && 
                           leftFile.lastModified === rightFile.lastModified) {
                    status = 'same';
                } else {
                    status = 'different';
                }
            } else if (leftFile) {
                status = 'only-left';
            } else {
                status = 'only-right';
            }

            results.push({
                path,
                name: leftFile?.name || rightFile?.name,
                kind: leftFile?.kind || rightFile?.kind,
                status,
                left: leftFile,
                right: rightFile,
                depth: path.split('/').length - 1
            });
        }

        this.comparisonResult = results;
        return results;
    }

    /**
     * Get comparison statistics
     * @returns {Object} Statistics
     */
    getStats() {
        let same = 0;
        let different = 0;
        let onlyLeft = 0;
        let onlyRight = 0;

        for (const item of this.comparisonResult) {
            if (item.kind === 'file') {
                switch (item.status) {
                    case 'same': same++; break;
                    case 'different': different++; break;
                    case 'only-left': onlyLeft++; break;
                    case 'only-right': onlyRight++; break;
                }
            }
        }

        return { same, different, onlyLeft, onlyRight };
    }

    /**
     * Get file content for comparison
     * @param {Object} fileInfo - File info object
     * @returns {Promise<string>} File content
     */
    async getFileContent(fileInfo) {
        if (!fileInfo || !fileInfo.handle) return '';
        
        try {
            const file = await fileInfo.handle.getFile();
            return await file.text();
        } catch (e) {
            console.error('Error reading file:', e);
            return '';
        }
    }

    /**
     * Build a tree structure from flat comparison results
     * @returns {Array} Tree structure
     */
    buildTree() {
        const tree = [];
        const nodeMap = new Map();

        for (const item of this.comparisonResult) {
            const parts = item.path.split('/');
            const node = {
                ...item,
                children: [],
                expanded: item.depth < 2 // Auto-expand first 2 levels
            };

            if (parts.length === 1) {
                tree.push(node);
            } else {
                const parentPath = parts.slice(0, -1).join('/');
                const parent = nodeMap.get(parentPath);
                if (parent) {
                    parent.children.push(node);
                } else {
                    tree.push(node); // Fallback
                }
            }

            nodeMap.set(item.path, node);
        }

        return tree;
    }

    /**
     * Get the comparison result
     * @returns {Array} Comparison results
     */
    getResult() {
        return this.comparisonResult;
    }
}

// Export for use in other modules
window.FolderCompare = FolderCompare;
