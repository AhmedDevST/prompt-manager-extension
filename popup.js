// Default prompts
const defaultPrompts = [
    {
        id: '1',
        title: 'Software Developer',
        text: 'Act as an experienced software developer. Help me with coding questions, best practices, debugging, and code reviews. Provide clean, well-commented code examples and explain your reasoning.'
    },
    {
        id: '2',
        title: 'Business Consultant',
        text: 'Act as a senior business consultant with expertise in strategy, operations, and growth. Analyze business problems, provide actionable recommendations, and help develop strategic plans.'
    },
    {
        id: '3',
        title: 'Technical Writer',
        text: 'Act as a professional technical writer. Help me create clear, concise documentation, user guides, API documentation, and technical explanations for complex topics.'
    },
    {
        id: '4',
        title: 'Code Reviewer',
        text: 'Please review this code for: 1) Bug potential 2) Performance issues 3) Security concerns 4) Code style and best practices 5) Suggestions for improvement. Provide specific feedback with examples.'
    },
    {
        id: '5',
        title: 'Marketing Strategist',
        text: 'Act as a digital marketing expert. Help me develop marketing strategies, create compelling copy, analyze target audiences, and optimize campaigns for better ROI.'
    }
];

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
            // Set default prompts on first install
            prompts = defaultPrompts;
            await chrome.storage.local.set({ prompts: defaultPrompts });
        }
    } catch (error) {
        console.error('Error loading prompts:', error);
        prompts = defaultPrompts;
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
        promptsList.innerHTML = '<div class="empty-state">No prompts found. Add your first prompt!</div>';
        return;
    }

    promptsList.innerHTML = displayPrompts.map(prompt => `
        <div class="prompt-item" data-id="${prompt.id}">
            <div class="prompt-header">
                <span>${prompt.title}</span>
                <span class="delete-btn" data-id="${prompt.id}">🗑️</span>
            </div>
            <div class="prompt-preview">${prompt.text.substring(0, 100)}...</div>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchBox').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = prompts.filter(p => 
            p.title.toLowerCase().includes(query) || 
            p.text.toLowerCase().includes(query)
        );
        renderPrompts(filtered);
    });

    // Add button
    document.getElementById('addBtn').addEventListener('click', () => {
        editingId = null;
        document.getElementById('modalTitle').textContent = 'Add New Prompt';
        document.getElementById('promptTitle').value = '';
        document.getElementById('promptText').value = '';
        document.getElementById('modal').style.display = 'block';
    });

    // Modal buttons
    document.getElementById('saveBtn').addEventListener('click', savePrompt);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    // Close modal when clicking outside
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });

    // Prompt list clicks (using event delegation)
    document.getElementById('promptsList').addEventListener('click', async (e) => {
        const promptItem = e.target.closest('.prompt-item');
        if (!promptItem) return;

        const promptId = promptItem.dataset.id;

        if (e.target.classList.contains('delete-btn')) {
            // Delete prompt
            prompts = prompts.filter(p => p.id !== promptId);
            await savePrompts();
            renderPrompts();
        } else {
            // Use prompt - paste into active tab
            const prompt = prompts.find(p => p.id === promptId);
            if (prompt) {
                await pastePrompt(prompt.text);
                window.close(); // Close popup after pasting
            }
        }
    });
}

// Save prompt (add or edit)
async function savePrompt() {
    const title = document.getElementById('promptTitle').value.trim();
    const text = document.getElementById('promptText').value.trim();

    if (!title || !text) {
        alert('Please fill in both title and prompt text');
        return;
    }

    if (editingId) {
        // Edit existing
        const index = prompts.findIndex(p => p.id === editingId);
        if (index !== -1) {
            prompts[index] = { ...prompts[index], title, text };
        }
    } else {
        // Add new
        const newPrompt = {
            id: Date.now().toString(),
            title,
            text
        };
        prompts.push(newPrompt);
    }

    await savePrompts();
    renderPrompts();
    closeModal();
}

// Close modal
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    editingId = null;
}

// Paste prompt into active tab
async function pastePrompt(text) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { 
            action: 'pastePrompt', 
            text: text 
        });
    } catch (error) {
        console.error('Error pasting prompt:', error);
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(text);
            console.log('Copied to clipboard as fallback');
        } catch (clipboardError) {
            console.error('Clipboard fallback failed:', clipboardError);
        }
    }
}