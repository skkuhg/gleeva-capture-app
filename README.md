# Gleeva Capture

A desktop application built with Electron that provides advanced screen capture capabilities with full screen and area selection functionality.

## Features

- **Full Screen Capture**: Capture your entire desktop screen
- **Area Selection**: Click and drag to select specific areas of your screen to capture
- **Auto-Clipboard Copy**: Screenshots automatically copied to clipboard for instant use
- **Manual Control**: You decide when to close or minimize the window - no automatic timers
- **Global Hotkeys**: `Ctrl+Shift+F` for full screen, `Ctrl+Shift+A` for area selection
- **System Tray Integration**: App runs in background, close window anytime and access from tray
- **Save to Local Folder**: Save captured images as PNG files with timestamps
- **Clean UI**: Simple and intuitive interface with manual minimize button

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd gleeva-capture-app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Development

Run the app in development mode:
```bash
npm start
```

## Building for Production

### Build for all platforms:
```bash
npm run dist
```

### Build for specific platforms:
```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

Built applications will be in the `dist` folder.

## Usage

1. **Full Screen Capture**: Click "Capture Full Screen" or press `Ctrl+Shift+F`
   - Automatically copies to clipboard
   - Close the window manually when you're done
2. **Area Selection**: Click "Select Area to Capture" or press `Ctrl+Shift+A`
   - A selection overlay will appear
   - Click and drag to select the area you want to capture
   - Release to capture the selected area
   - Automatically copies to clipboard
   - Close the window manually when you're done
3. **Manual Actions**: 
   - Click "Save to Folder" to save the captured image
   - Click "Copy to Clipboard" for manual copy
   - Click "Minimize to Tray" to hide the window when you're ready
4. **Full Control**: You decide when to close or minimize - no automatic timers

## Permissions

The app requires the following permissions:
- **Screen recording permission** (for desktop capture functionality)
- **File system access** (for saving images)

## Project Structure

```
gleeva-capture-app/
├── main.js          # Main process file
├── preload.js       # Preload script for IPC
├── renderer.js      # Renderer process logic
├── index.html       # Main UI
├── styles.css       # Styling
├── package.json     # Project configuration
└── README.md        # This file
```

## Security

- Context isolation is enabled
- Node integration is disabled in renderer
- All IPC communication goes through the preload script
- Content Security Policy is implemented

## Troubleshooting

### Screenshot not capturing
- On macOS, grant screen recording permission in System Preferences
- Ensure the app window is visible and not minimized

### Build errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js and npm versions

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request