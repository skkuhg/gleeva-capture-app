// DOM Elements
const captureFullScreenBtn = document.getElementById('captureFullScreen');
const captureAreaBtn = document.getElementById('captureArea');
const screenPreview = document.getElementById('screenPreview');
const screenPlaceholder = document.getElementById('screenPlaceholder');
const previewCanvas = document.getElementById('previewCanvas');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const imageActions = document.getElementById('imageActions');
const saveImageBtn = document.getElementById('saveImage');
const copyImageBtn = document.getElementById('copyImage');
const clearScreenshotBtn = document.getElementById('clearScreenshot');
const minimizeAppBtn = document.getElementById('minimizeApp');
const closeAppBtn = document.getElementById('closeApp');
const headerCloseBtn = document.getElementById('headerCloseBtn');
const toast = document.getElementById('toast');
const selectionOverlay = document.getElementById('selectionOverlay');
const selectionCanvas = document.getElementById('selectionCanvas');
const cancelSelectionBtn = document.getElementById('cancelSelection');

// State
let currentImageData = null;
let currentImageType = null;
let screenStream = null;
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };

// Initialize canvas contexts
const previewCtx = previewCanvas.getContext('2d');
const screenCtx = screenPreview.getContext('2d');
const selectionCtx = selectionCanvas.getContext('2d');

// Toast notification function
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast show toast-${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Get screen stream for preview and capture
async function getScreenStream() {
  try {
    const sources = await window.electronAPI.getSources();
    
    if (sources.length === 0) {
      showToast('No screen sources available. Please grant screen recording permission.', 'error');
      return null;
    }
    
    // Find the best screen source
    let selectedSource = sources.find(source => 
      source.name.includes('Entire') || 
      source.name === 'Screen 1' ||
      source.name.toLowerCase().includes('primary')
    );
    
    if (!selectedSource) {
      selectedSource = sources[0];
    }
    
    console.log('Using screen source:', selectedSource.name);
    
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource.id,
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 30
        }
      }
    });
    
    return stream;
  } catch (error) {
    console.error('Error getting screen stream:', error);
    if (error.name === 'NotAllowedError') {
      showToast('Screen recording permission denied. Please allow screen access.', 'error');
    } else {
      showToast('Failed to access screen. Try again.', 'error');
    }
    return null;
  }
}

// Full screen capture
async function captureFullScreen() {
  try {
    // Hide the app window first
    await window.electronAPI.hideWindow();
    
    // Wait a bit more for the window to be fully hidden
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const stream = await getScreenStream();
    if (!stream) {
      // Show window again if stream failed
      await window.electronAPI.showWindow();
      return;
    }
    
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
      video.onloadedmetadata = async () => {
      // Set canvas size to match video
      previewCanvas.width = video.videoWidth;
      previewCanvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      previewCtx.drawImage(video, 0, 0, previewCanvas.width, previewCanvas.height);
        // Get image data
      currentImageData = previewCanvas.toDataURL('image/png');
      currentImageType = 'fullscreen';
      
      // Auto-copy to clipboard for quick workflow
      const clipboardResult = await window.electronAPI.copyToClipboard(currentImageData);
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      
      // Show the window again
      await window.electronAPI.showWindow();
      
      // Update UI
      previewCanvas.style.display = 'block';
      previewPlaceholder.style.display = 'none';
      imageActions.style.display = 'flex';
        const message = clipboardResult.success 
        ? 'Full screen captured & copied to clipboard!'
        : 'Full screen captured!';
      
      showToast(message, 'success');
      
      // Remove auto-hide - let user manually close when ready
    };
    
    video.onerror = async () => {
      stream.getTracks().forEach(track => track.stop());
      await window.electronAPI.showWindow();
      showToast('Error loading video stream', 'error');
    };
    
  } catch (error) {
    console.error('Error capturing full screen:', error);
    // Make sure to show window again on error
    await window.electronAPI.showWindow();
    showToast('Failed to capture screen', 'error');
  }
}

// Start area selection mode
async function startAreaSelection() {
  try {
    // Hide the app window first
    await window.electronAPI.hideWindow();
    
    // Wait for window to be fully hidden
    await new Promise(resolve => setTimeout(resolve, 300));
    
    screenStream = await getScreenStream();
    if (!screenStream) {
      await window.electronAPI.showWindow();
      return;
    }
    
    // Show the window again for the selection interface
    await window.electronAPI.showWindow();
    
    // Show overlay
    selectionOverlay.style.display = 'block';
    
    // Set up selection canvas to cover the entire screen
    selectionCanvas.width = window.screen.width;
    selectionCanvas.height = window.screen.height;
    
    // Create video element for preview
    const video = document.createElement('video');
    video.srcObject = screenStream;
    video.play();
    
    video.onloadedmetadata = () => {
      // Set screen preview canvas size
      screenPreview.width = video.videoWidth;
      screenPreview.height = video.videoHeight;
      
      // Draw initial frame
      screenCtx.drawImage(video, 0, 0, screenPreview.width, screenPreview.height);
      
      // Update UI
      screenPreview.style.display = 'block';
      screenPlaceholder.style.display = 'none';
      
      showToast('Click and drag to select area', 'info');
    };
    
  } catch (error) {
    console.error('Error starting area selection:', error);
    await window.electronAPI.showWindow();
    showToast('Failed to start area selection', 'error');
  }
}

// Selection event handlers
function handleSelectionStart(e) {
  isSelecting = true;
  const rect = selectionCanvas.getBoundingClientRect();
  selectionStart.x = e.clientX - rect.left;
  selectionStart.y = e.clientY - rect.top;
  selectionEnd.x = selectionStart.x;
  selectionEnd.y = selectionStart.y;
}

function handleSelectionMove(e) {
  if (!isSelecting) return;
  
  const rect = selectionCanvas.getBoundingClientRect();
  selectionEnd.x = e.clientX - rect.left;
  selectionEnd.y = e.clientY - rect.top;
  
  // Clear and redraw selection
  selectionCtx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
  
  // Draw selection rectangle
  const width = selectionEnd.x - selectionStart.x;
  const height = selectionEnd.y - selectionStart.y;
  
  selectionCtx.strokeStyle = '#3498db';
  selectionCtx.lineWidth = 2;
  selectionCtx.setLineDash([5, 5]);
  selectionCtx.strokeRect(selectionStart.x, selectionStart.y, width, height);
  
  selectionCtx.fillStyle = 'rgba(52, 152, 219, 0.1)';
  selectionCtx.fillRect(selectionStart.x, selectionStart.y, width, height);
}

function handleSelectionEnd(e) {
  if (!isSelecting) return;
  
  isSelecting = false;
  
  // Calculate selection area
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);
  
  if (width < 10 || height < 10) {
    showToast('Selection too small. Try again.', 'error');
    return;
  }
  
  // Capture the selected area
  captureSelectedArea();
}

function captureSelectedArea() {
  if (!screenStream) return;
  
  // Hide the window again before capture
  window.electronAPI.hideWindow().then(() => {
    // Wait for window to be hidden
    setTimeout(() => {
      const video = document.createElement('video');
      video.srcObject = screenStream;
      video.play();
      
      video.onloadedmetadata = async () => {
        // Calculate scaling factors
        const scaleX = video.videoWidth / selectionCanvas.width;
        const scaleY = video.videoHeight / selectionCanvas.height;
        
        // Calculate actual selection coordinates on the video
        const x = Math.min(selectionStart.x, selectionEnd.x) * scaleX;
        const y = Math.min(selectionStart.y, selectionEnd.y) * scaleY;
        const width = Math.abs(selectionEnd.x - selectionStart.x) * scaleX;
        const height = Math.abs(selectionEnd.y - selectionStart.y) * scaleY;
        
        // Create temporary canvas for full screen
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        
        // Draw full screen to temp canvas
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Set preview canvas to selection size
        previewCanvas.width = width;
        previewCanvas.height = height;
        
        // Draw selected area to preview canvas
        previewCtx.drawImage(tempCanvas, x, y, width, height, 0, 0, width, height);
          // Get image data
        currentImageData = previewCanvas.toDataURL('image/png');
        currentImageType = 'area_selection';
        
        // Auto-copy to clipboard for quick workflow
        const clipboardResult = await window.electronAPI.copyToClipboard(currentImageData);
        
        // Clean up
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        
        // Show window again
        await window.electronAPI.showWindow();
        
        // Hide overlay
        selectionOverlay.style.display = 'none';
        selectionCtx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
          // Update UI
        previewCanvas.style.display = 'block';
        previewPlaceholder.style.display = 'none';
        imageActions.style.display = 'flex';        const message = clipboardResult.success 
          ? 'Selected area captured & copied to clipboard!'
          : 'Selected area captured!';
        
        showToast(message, 'success');
        
        // Remove auto-hide - let user manually close when ready
      };
    }, 200);
  });
}

function cancelSelection() {
  isSelecting = false;
  
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }
  
  selectionOverlay.style.display = 'none';
  selectionCtx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
  
  // Make sure window is shown
  window.electronAPI.showWindow();
  
  showToast('Selection cancelled', 'info');
}

// Save and Copy Functions
async function saveImage() {
  if (!currentImageData) return;
  
  try {
    const result = await window.electronAPI.saveImage(currentImageData, currentImageType);
    
    if (result.success) {
      showToast(`Image saved successfully!`, 'success');
      // Remove auto-minimize - let user decide when to close
    } else if (result.canceled) {
      showToast('Save canceled', 'info');
    } else {
      showToast(`Failed to save image: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Error saving image:', error);
    showToast('Failed to save image', 'error');
  }
}

async function copyToClipboard() {
  if (!currentImageData) return;
  
  try {
    const result = await window.electronAPI.copyToClipboard(currentImageData);
    
    if (result.success) {
      showToast('Image copied to clipboard!', 'success');
      // Remove auto-minimize - let user decide when to close
    } else {
      showToast(`Failed to copy image: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Error copying image:', error);
    showToast('Failed to copy image', 'error');
  }
}

// Manual minimize function
async function minimizeToTray() {
  await window.electronAPI.hideWindow();
  showToast('Minimized to tray', 'info');
}

// Close window function
async function closeWindow() {
  await window.electronAPI.hideWindow();
}

// Clear screenshot function
function clearScreenshot() {
  // Clear the current image data
  currentImageData = null;
  currentImageType = null;
  
  // Hide the preview canvas and show placeholder
  previewCanvas.style.display = 'none';
  previewPlaceholder.style.display = 'flex';
  
  // Hide the action buttons
  imageActions.style.display = 'none';
  
  // Clear the canvas
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  
  // Also clear screen preview if visible
  if (screenPreview.style.display === 'block') {
    screenPreview.style.display = 'none';
    screenPlaceholder.style.display = 'flex';
    screenCtx.clearRect(0, 0, screenPreview.width, screenPreview.height);
  }
  
  showToast('Screenshot cleared! Ready for new capture.', 'info');
}

// Event Listeners
captureFullScreenBtn.addEventListener('click', captureFullScreen);
captureAreaBtn.addEventListener('click', startAreaSelection);
saveImageBtn.addEventListener('click', saveImage);
copyImageBtn.addEventListener('click', copyToClipboard);
clearScreenshotBtn.addEventListener('click', clearScreenshot);
minimizeAppBtn.addEventListener('click', minimizeToTray);
closeAppBtn.addEventListener('click', closeWindow);
headerCloseBtn.addEventListener('click', closeWindow);
cancelSelectionBtn.addEventListener('click', cancelSelection);

// Selection canvas event listeners
selectionCanvas.addEventListener('mousedown', handleSelectionStart);
selectionCanvas.addEventListener('mousemove', handleSelectionMove);
selectionCanvas.addEventListener('mouseup', handleSelectionEnd);

// Prevent context menu on selection canvas
selectionCanvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Listen for tray actions
window.electronAPI.onTrayAction(() => {
  captureFullScreen();
});

window.electronAPI.onTrayAreaAction(() => {
  startAreaSelection();
});

// Keyboard shortcut for closing window (Escape key)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeWindow();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    // Clear screenshot with Delete or Backspace key
    if (currentImageData) {
      clearScreenshot();
    }
  }
});