let prompts = [];
let editingId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadPrompts();
    renderPrompts();
    setupEventListeners();
});

// Load prompts from storage
async function loadPrompts() {
    try {
        const result = await chrome.storage.local.get(['prompts']);
        if (result.prompts && result.prompts.length > 0) {
            prompts = result.prompts;
        } else {
            // Start with empty prompts array
            prompts = [];
            await chrome.storage.local.set({ prompts: [] });
        }
    } catch (error) {
        console.error('Error loading prompts:', error);
        prompts = [];
    }
}

// Save prompts to storage
async function savePrompts() {
    try {
        await chrome.storage.local.set({ prompts: prompts });
    } catch (error) {
        console.error('Error saving prompts:', error);
    }
}

// Render prompts list
function renderPrompts(filteredPrompts = null) {
    const promptsList = document.getElementById('promptsList');
    const displayPrompts = filteredPrompts || prompts;

    if (displayPrompts.length === 0) {
        promptsList.innerHTML = `
            <div class="empty-state">
                <i class="material-icons" style="font-size: 48px; margin-bottom: 16px; color: #cbd5e1;">lightbulb_outline</i>
                <div>No prompts found. Add your first prompt!</div>
            </div>
        `;
        return;
    }

    promptsList.innerHTML = displayPrompts.map(prompt => `
        <div class="prompt-item" data-id="${prompt.id}">
            <div class="prompt-header">
                <span>${prompt.title}</span>
                <div class="prompt-actions">
                    <button class="edit-btn" data-id="${prompt.id}" title="Edit prompt">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="delete-btn" data-id="${prompt.id}" title="Delete prompt">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
            </div>
            <div class="prompt-preview">${prompt.text.substring(0, 100)}${prompt.text.length > 100 ? '...' : ''}</div>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality with debouncing
    let searchTimeout;
    document.getElementById('searchBox').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase();
            const filtered = prompts.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.text.toLowerCase().includes(query)
            );
            renderPrompts(filtered);
        }, 300);
    });

    // Add button
    document.getElementById('addBtn').addEventListener('click', () => {
        editingId = null;
        document.getElementById('modalTitle').textContent = 'Add New Prompt';
        document.getElementById('promptTitle').value = '';
        document.getElementById('promptText').value = '';
        document.getElementById('modal').style.display = 'block';
        // Focus on title input
        setTimeout(() => document.getElementById('promptTitle').focus(), 100);
    });

    // Modal buttons
    document.getElementById('saveBtn').addEventListener('click', savePrompt);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    // Close modal when clicking outside
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key to close modal
        if (e.key === 'Escape' && document.getElementById('modal').style.display === 'block') {
            closeModal();
        }
        // Ctrl/Cmd + S to save in modal
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && document.getElementById('modal').style.display === 'block') {
            e.preventDefault();
            savePrompt();
        }
        // Ctrl/Cmd + N to add new prompt
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && document.getElementById('modal').style.display !== 'block') {
            e.preventDefault();
            document.getElementById('addBtn').click();
        }
    });

    // Prompt list clicks (using event delegation)
    document.getElementById('promptsList').addEventListener('click', async (e) => {
        const promptItem = e.target.closest('.prompt-item');
        if (!promptItem) return;

        const promptId = promptItem.dataset.id;

        // Check if edit button or its icon was clicked
        if (e.target.closest('.edit-btn')) {
            const prompt = prompts.find(p => p.id === promptId);
            if (prompt) {
                editingId = promptId;
                document.getElementById('modalTitle').textContent = 'Edit Prompt';
                document.getElementById('promptTitle').value = prompt.title;
                document.getElementById('promptText').value = prompt.text;
                document.getElementById('modal').style.display = 'block';
                // Focus on title input
                setTimeout(() => document.getElementById('promptTitle').focus(), 100);
            }
        }
        // Check if delete button or its icon was clicked
        else if (e.target.closest('.delete-btn')) {
            // Show confirmation dialog
            if (confirm('Are you sure you want to delete this prompt?')) {
                prompts = prompts.filter(p => p.id !== promptId);
                await savePrompts();
                renderPrompts();
                
                // Show success feedback
                showToast('Prompt deleted successfully!');
            }
        } else {
            // Use prompt - paste into active tab (only if not clicking action buttons)
            if (!e.target.closest('.prompt-actions')) {
                const prompt = prompts.find(p => p.id === promptId);
                if (prompt) {
                    await pastePrompt(prompt.text);
                }
            }
        }
    });

    // Real-time validation
    document.getElementById('promptTitle').addEventListener('input', () => {
        clearValidationErrors();
    });
    
    document.getElementById('promptText').addEventListener('input', () => {
        clearValidationErrors();
    });
}

// Save prompt (add or edit)
async function savePrompt() {
    const titleInput = document.getElementById('promptTitle');
    const textInput = document.getElementById('promptText');
    const title = titleInput.value.trim();
    const text = textInput.value.trim();

    // Clear previous error states
    clearValidationErrors();

    let hasErrors = false;

    // Validate title
    if (!title) {
        showFieldError(titleInput, 'Title is required');
        hasErrors = true;
    } else if (title.length > 100) {
        showFieldError(titleInput, 'Title must be less than 100 characters');
        hasErrors = true;
    }

    // Validate text
    if (!text) {
        showFieldError(textInput, 'Prompt text is required');
        hasErrors = true;
    } else if (text.length < 10) {
        showFieldError(textInput, 'Prompt text must be at least 10 characters');
        hasErrors = true;
    }

    // Check for duplicate titles (excluding current prompt if editing)
    const duplicatePrompt = prompts.find(p => 
        p.title.toLowerCase() === title.toLowerCase() && 
        p.id !== editingId
    );
    
    if (duplicatePrompt) {
        showFieldError(titleInput, 'A prompt with this title already exists');
        hasErrors = true;
    }

    if (hasErrors) {
        showToast('Please fix the errors above', 'error');
        return;
    }

    if (editingId) {
        // Edit existing
        const index = prompts.findIndex(p => p.id === editingId);
        if (index !== -1) {
            prompts[index] = { ...prompts[index], title, text };
            showToast('Prompt updated successfully!');
        }
    } else {
        // Add new
        const newPrompt = {
            id: Date.now().toString(),
            title,
            text
        };
        prompts.push(newPrompt);
        showToast('Prompt added successfully!');
    }

    await savePrompts();
    renderPrompts();
    closeModal();
}

// Show field validation error
function showFieldError(input, message) {
    const inputGroup = input.closest('.input-group');
    
    // Remove existing error
    const existingError = inputGroup.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    // Add error styling
    input.style.borderColor = '#ef4444';
    input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = `
        color: #ef4444;
        font-size: 12px;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
    `;
    errorDiv.innerHTML = `<i class="material-icons" style="font-size: 14px;">error</i>${message}`;
    
    inputGroup.appendChild(errorDiv);
}

// Clear all validation errors
function clearValidationErrors() {
    const inputs = document.querySelectorAll('#promptTitle, #promptText');
    inputs.forEach(input => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        
        const inputGroup = input.closest('.input-group');
        const existingError = inputGroup.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    });
}

// Close modal
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    clearValidationErrors();
    editingId = null;
}

// Show toast notification
function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Create icon element
    const icon = document.createElement('i');
    icon.className = 'material-icons';
    icon.textContent = type === 'error' ? 'error' : 'check_circle';
    icon.style.fontSize = '20px'; // Ensure icon size is consistent
    
    // Create message span
    const span = document.createElement('span');
    span.textContent = message;
    
    // Append elements
    toast.appendChild(icon);
    toast.appendChild(span);
    
    // Add toast styles
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#ef4444' : '#10b981',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: '1001',
        animation: 'slideUp 0.3s ease'
    });

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { transform: translateX(-50%) translateY(100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 300);
    }, 9000);
}

// Enhanced paste prompt function with better error handling
async function pastePrompt(text) {
    console.log('Attempting to paste prompt:', text.substring(0, 50) + '...');
    
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error('No active tab found');
        }
        
        console.log('Active tab:', tab.url);
        
        // Check if we can access the tab
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
            throw new Error('Cannot access browser internal pages');
        }
        
        // First try to inject content script if not already injected
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['../script/content.js']
            });
            console.log('Content script injected successfully');
        } catch (injectError) {
            console.log('Content script already exists or injection failed:', injectError.message);
        }
        
        // Small delay to ensure content script is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Send message to content script
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'pastePrompt', 
            text: text 
        });
        
        if (response && response.success) {
            showToast('Prompt pasted successfully!');
            // Close popup after short delay
            setTimeout(() => window.close(), 800);
        } else {
            throw new Error('Content script returned failure');
        }
        
    } catch (error) {
        console.error('Error pasting prompt:', error);
        
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(text);
            showToast('Prompt copied to clipboard!');
            console.log('Copied to clipboard as fallback');
            // Don't close popup immediately for clipboard fallback
            setTimeout(() => window.close(), 1500);
        } catch (clipboardError) {
            console.error('Clipboard fallback failed:', clipboardError);
            showToast(' Failed to paste or copy prompt', 'error');
        }
    }
}