# Prompt Manager Chrome Extension

A powerful Chrome extension that helps you manage and quickly paste AI prompts into various chat interfaces like ChatGPT, Claude, Google Gemini, and other AI chat platforms.

![Prompt Manager](images/icon128.png)

## Features

- 📝 Save and organize your frequently used prompts
- 🔍 Quick search functionality to find specific prompts
- 📋 One-click paste into AI chat interfaces
- ✏️ Edit and customize your saved prompts
- 🎨 Clean, modern UI 
- ⌨️ Keyboard shortcuts for faster workflow
- 🔄 Real-time synchronization with Chrome storage
- 🌐 Works with popular AI platforms:
  - ChatGPT
  - Claude (Anthropic)
  - Google Gemini
  - Other chat interfaces

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Prompt Manager icon should now appear in your Chrome toolbar

## Usage

1. Click the Prompt Manager icon in your Chrome toolbar to open the popup
2. Add new prompts using the "Add New Prompt" button
3. Give your prompt a title and enter the prompt text
4. Save your prompt to add it to your collection
5. Click on any saved prompt to instantly paste it into the active chat interface

### Keyboard Shortcuts

- `Ctrl/Cmd + N`: Add new prompt
- `Ctrl/Cmd + S`: Save prompt (when editing)
- `Esc`: Close modal

## Development

### Project Structure

```
prompt-manager-extension/
├── manifest.json        # Extension manifest
├── images/              # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/               # Popup interface files
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── scripts/             # Content and background scripts
    └── content.js
```
## Author
AhmedDevST

