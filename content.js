// Enhanced content script for chat interfaces
console.log('Prompt Manager content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'pastePrompt') {
        try {
            const success = pasteTextIntoActiveElement(request.text);
            sendResponse({ success: success });
        } catch (error) {
            console.error('Error in pastePrompt:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    // Important: return true to indicate async response
    return true;
});

function pasteTextIntoActiveElement(text) {
    console.log('Attempting to paste text:', text.substring(0, 50) + '...');
    
    // Enhanced selectors for popular chat interfaces
    const chatSelectors = [
        // ChatGPT
        'textarea[data-id="root"]',
        'textarea[placeholder*="Message ChatGPT"]',
        'textarea#prompt-textarea',
        
        // Claude (Anthropic)
        'div[contenteditable="true"][data-testid="basic-text-input"]',
        'div[contenteditable="true"]',
        'textarea[placeholder*="Talk to Claude"]',
        
        // Gemini (Google Bard)
        'div[contenteditable="true"][data-placeholder*="Enter a prompt"]',
        'textarea[placeholder*="Enter a prompt"]',
        
        // Generic selectors
        'textarea[placeholder*="message" i]',
        'textarea[placeholder*="prompt" i]',
        'textarea[placeholder*="ask" i]',
        'textarea[placeholder*="chat" i]',
        'textarea[placeholder*="type" i]',
        'div[contenteditable="true"]',
        'textarea:not([readonly]):not([disabled])',
        'input[type="text"]:not([readonly]):not([disabled])'
    ];
    
    let targetElement = null;
    
    // First, try the currently focused element
    const activeElement = document.activeElement;
    if (activeElement && isValidTextInput(activeElement)) {
        targetElement = activeElement;
        console.log('Using focused element:', targetElement.tagName);
    }
    
    // If no focused element, search for chat input
    if (!targetElement) {
        for (const selector of chatSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                if (isValidTextInput(element) && isVisible(element)) {
                    targetElement = element;
                    console.log('Found target element with selector:', selector);
                    break;
                }
            }
            if (targetElement) break;
        }
    }
    
    if (targetElement) {
        return insertTextIntoElement(targetElement, text);
    } else {
        console.log('No suitable text input found, copying to clipboard');
        copyToClipboard(text);
        return false;
    }
}

function insertTextIntoElement(element, text) {
    try {
        // Focus the element first
        element.focus();
        element.click();
        
        // Small delay to ensure focus
        setTimeout(() => {
            if (element.contentEditable === 'true') {
                // Handle contenteditable elements (like Claude)
                insertIntoContentEditable(element, text);
            } else {
                // Handle textarea and input elements
                insertIntoTextarea(element, text);
            }
            
            // Show success notification
            showNotification('✅ Prompt pasted successfully!');
        }, 50);
        
        return true;
    } catch (error) {
        console.error('Error inserting text:', error);
        copyToClipboard(text);
        return false;
    }
}

function insertIntoContentEditable(element, text) {
    // Clear existing content
    element.innerHTML = '';
    
    // Insert text as plain text
    element.textContent = text;
    
    // Move cursor to end
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Trigger events that frameworks expect
    const events = ['input', 'change', 'keyup', 'paste'];
    events.forEach(eventType => {
        element.dispatchEvent(new Event(eventType, { 
            bubbles: true, 
            cancelable: true 
        }));
    });
    
    // Special handling for React components
    triggerReactChange(element, text);
}

function insertIntoTextarea(element, text) {
    // Store current selection
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    
    // Insert text at cursor position or replace selected text
    const currentValue = element.value || '';
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    
    element.value = newValue;
    
    // Set cursor position after inserted text
    const newCursorPos = start + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger events
    const events = ['input', 'change', 'keyup', 'paste'];
    events.forEach(eventType => {
        element.dispatchEvent(new Event(eventType, { 
            bubbles: true, 
            cancelable: true 
        }));
    });
    
    // Special handling for React components
    triggerReactChange(element, newValue);
}

function triggerReactChange(element, value) {
    // Try to trigger React's onChange by setting the value descriptor
    try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
        ) || Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        );
        
        if (nativeInputValueSetter && nativeInputValueSetter.set) {
            nativeInputValueSetter.set.call(element, value);
            
            // Dispatch React synthetic event
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    } catch (error) {
        console.log('React event trigger failed:', error);
    }
}

function isValidTextInput(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const type = element.type ? element.type.toLowerCase() : '';
    const isReadonly = element.readOnly || element.disabled;
    
    return !isReadonly && (
        tagName === 'textarea' ||
        (tagName === 'input' && ['text', 'search', ''].includes(type)) ||
        element.contentEditable === 'true'
    );
}

function isVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.top >= 0 &&
        rect.left >= 0
    );
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied to clipboard');
        showNotification('📋 Prompt copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        showNotification('❌ Failed to copy prompt', 'error');
    });
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.prompt-manager-notification');
    existing.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = 'prompt-manager-notification';
    notification.textContent = message;
    
    const bgColor = type === 'error' ? '#ef4444' : '#10b981';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 999999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        backdrop-filter: blur(10px);
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Add animation styles
    if (!document.querySelector('#prompt-manager-styles')) {
        const style = document.createElement('style');
        style.id = 'prompt-manager-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Prompt Manager: DOM ready');
    });
} else {
    console.log('Prompt Manager: Already loaded');
}