// Content script to handle prompt pasting
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'pastePrompt') {
        pasteTextIntoActiveElement(request.text);
        sendResponse({ success: true });
    }
});

function pasteTextIntoActiveElement(text) {
    // Find the active text input element
    let activeElement = document.activeElement;
    
    // If no active element, try to find common chat input selectors
    if (!activeElement || !isTextInput(activeElement)) {
        const selectors = [
            'textarea[placeholder*="message"]',
            'textarea[placeholder*="prompt"]',
            'textarea[placeholder*="ask"]',
            'div[contenteditable="true"]',
            'textarea',
            'input[type="text"]'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && isVisible(element)) {
                activeElement = element;
                break;
            }
        }
    }
    
    if (activeElement && isTextInput(activeElement)) {
        // Focus the element first
        activeElement.focus();
        
        // Handle different input types
        if (activeElement.contentEditable === 'true') {
            // For contenteditable divs (like some modern chat interfaces)
            activeElement.innerText = text;
            // Trigger input event
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // For regular textarea and input elements
            activeElement.value = text;
            // Trigger events that frameworks expect
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            activeElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Set cursor to end
        if (activeElement.setSelectionRange) {
            const length = activeElement.value ? activeElement.value.length : text.length;
            activeElement.setSelectionRange(length, length);
        }
        
        console.log('Prompt pasted successfully');
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            console.log('No suitable input found, copied to clipboard');
            showNotification('Prompt copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    }
}

function isTextInput(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const type = element.type ? element.type.toLowerCase() : '';
    
    return (
        tagName === 'textarea' ||
        (tagName === 'input' && (type === 'text' || type === 'search' || type === '')) ||
        element.contentEditable === 'true'
    );
}

function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
}

function showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: system-ui;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}