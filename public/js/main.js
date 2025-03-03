// main.js

// ===========================
// Configuration and Constants
// ===========================

// IndexedDB variables
const DB_NAME = 'inspectionDB';
const DB_VERSION = 1;
const STORE_NAME = 'aset';

// Time synchronization variables
let timeOffset = 0; // Difference between server and client time in ms
let lastSyncPerformanceTime = 0;
let lastSyncServerTime = 0;

// Monotonic timestamp variables
const LAST_TIMESTAMP_KEY = 'lastTimestamp'; // Key to store last timestamp in localStorage

// Store original options for dependent selects
const originalOptions = {
    id_tipe_aset: [],
    id_tipe_hb: [],
    id_tipe_door: []
};

// Floor Assets Mapping
const floorAssets = {}; // Mapping of floorId to array of assets

// ===========================
// DOM Elements
// ===========================

// Declare DOM elements with 'let' to initialize them later
let entryList;
let savedEntriesDiv;
let toggleSavedEntriesButton;
let kirimSemuaButton;
let kirimSemuaSpinner;
let statusIndicator;
let notification;
let notificationIcon;
let notificationMessage;
let saveButton;
let inspectionForm;
let previewImg;
let assetsStatusList; // New element

// ===========================
// IndexedDB Initialization
// ===========================

let db;

function initDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
        showNotification('Failed to open the database.', 'error');
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            // Define indexes if needed
            objectStore.createIndex('client_timestamp', 'client_timestamp', { unique: false });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        displaySavedEntries();
    };
}

// ===========================
// Time Synchronization
// ===========================

/**
 * Fetches the current server time from the server.
 * @returns {Promise<string>} A promise that resolves to the server time in ISO 8601 format.
 */
async function fetchServerTime() {
    try {
        const response = await fetch('/api/server-time', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        const data = await response.json();
        if (!data.serverTime) {
            throw new Error('Server time not found in response');
        }
        return data.serverTime; // Expected format: '2024-04-25T12:34:56Z'
    } catch (error) {
        console.error('Error fetching server time:', error);
        throw error;
    }
}

/**
 * Synchronizes client time with server time and stores reference values for monotonic time calculation.
 */
async function synchronizeTime() {
    try {
        const serverTimeStr = await fetchServerTime();
        const serverTime = new Date(serverTimeStr).getTime();
        const clientTime = Date.now();
        // Compute offset if needed elsewhere, but note that our monotonic calculation won't reapply it.
        const offset = serverTime - clientTime;
        localStorage.setItem('serverTimeOffset', offset);

        // Update reference points using the monotonic clock
        const currentPerf = performance.now();
        localStorage.setItem('lastSyncServerTime', serverTime);
        localStorage.setItem('lastSyncPerformanceTime', currentPerf);

        // Ensure monotonicity for timestamps
        const lastTimestamp = parseInt(localStorage.getItem(LAST_TIMESTAMP_KEY), 10) || serverTime;
        localStorage.setItem(LAST_TIMESTAMP_KEY, Math.max(lastTimestamp, serverTime));

        console.log(`Time synchronized. Offset: ${offset} ms`);
        console.log(`Last Sync Server Time: ${serverTime}`);
        console.log(`Last Sync Performance Time: ${currentPerf}`);
    } catch (error) {
        console.error('Failed to synchronize time:', error);
        showNotification('Failed to synchronize time with server.', 'error');
    }
}

/**
 * Estimates the current server time using stored reference values and the monotonic performance clock.
 * @returns {number} Estimated server time in ms since epoch.
 */
function getCurrentServerTime() {
    const storedServerTime = parseInt(localStorage.getItem('lastSyncServerTime'), 10);
    const storedPerfTime = parseFloat(localStorage.getItem('lastSyncPerformanceTime'));
    if (isNaN(storedServerTime) || isNaN(storedPerfTime)) {
        // Fallback to system time if no sync data is available
        return Date.now();
    }
    const elapsed = performance.now() - storedPerfTime;
    return storedServerTime + elapsed;
}

/**
 * Checks if there is significant time drift between the estimated server time and the current system time.
 * @returns {boolean} True if drift is significant, otherwise false.
 */
function isTimeDrifted() {
    const estimatedServerTime = getCurrentServerTime();
    const systemTime = Date.now();
    const drift = Math.abs(systemTime - estimatedServerTime);
    console.log(`Time Drift: ${drift} ms`);
    // Consider drift significant if greater than 2 minutes
    return drift > 2 * 60 * 1000;
}

/**
 * Generates a reliable, monotonic timestamp.
 * @returns {string} An ISO 8601 formatted timestamp.
 */
function getReliableTimestamp() {
    const currentTime = getCurrentServerTime();
    let lastTimestamp = parseInt(localStorage.getItem(LAST_TIMESTAMP_KEY), 10);
    if (isNaN(lastTimestamp)) {
        lastTimestamp = currentTime;
    }
    const newTimestamp = Math.max(currentTime, lastTimestamp + 1);
    localStorage.setItem(LAST_TIMESTAMP_KEY, newTimestamp);
    return new Date(newTimestamp).toISOString();
}

/**
 * Initializes time synchronization based on network availability.
 * When online, it synchronizes with the server; when offline, it uses stored values.
 */
async function initializeTimeSync() {
    if (navigator.onLine) {
        await synchronizeTime();
    } else {
        // Offline: try to use stored sync values; if not present, initialize with current system time.
        const storedServerTime = parseInt(localStorage.getItem('lastSyncServerTime'), 10);
        const storedPerfTime = parseFloat(localStorage.getItem('lastSyncPerformanceTime'));
        if (isNaN(storedServerTime) || isNaN(storedPerfTime)) {
            const now = Date.now();
            localStorage.setItem('lastSyncServerTime', now);
            localStorage.setItem('lastSyncPerformanceTime', performance.now());
            localStorage.setItem('serverTimeOffset', 0);
            localStorage.setItem(LAST_TIMESTAMP_KEY, now);
            console.log('Offline mode: Initialized new time reference values.');
        } else {
            console.log('Offline mode: Using stored time reference values.');
        }
    }
}

// ===========================
// Monotonic Timestamp Functions
// ===========================

/**
 * Generates a reliable and monotonic timestamp.
 * @returns {string} An ISO 8601 formatted timestamp.
 */
function getReliableTimestamp() {
    // Calculate the current server-aligned time
    const currentTime = getCurrentServerTime();

    // Retrieve the last timestamp used
    let lastTimestamp = parseInt(localStorage.getItem(LAST_TIMESTAMP_KEY), 10);
    if (isNaN(lastTimestamp)) {
        lastTimestamp = currentTime;
    }

    // Ensure the new timestamp is greater than the last timestamp
    const newTimestamp = Math.max(currentTime, lastTimestamp + 1);

    // Update the lastTimestamp in storage
    localStorage.setItem(LAST_TIMESTAMP_KEY, newTimestamp);

    // Return the new timestamp in ISO format
    return new Date(newTimestamp).toISOString();
}

// ===========================
// User Interface Functions
// ===========================

/**
 * Display notifications to the user.
 * @param {string} message - The notification message.
 * @param {string} type - Type of notification: 'success', 'error', 'info'.
 */
let currentNotification = null; // Track the current notification

function showNotification(message, type) {
    // If a notification is already being shown, update its content and type
    if (currentNotification) {
        notificationMessage.textContent = message;
        notification.classList.remove('success', 'error', 'info');
        notificationIcon.classList.remove('fa-check-circle', 'fa-times-circle', 'fa-info-circle');

        if (type === 'success') {
            notification.classList.add('success');
            notificationIcon.classList.add('fa-check-circle');
        } else if (type === 'error') {
            notification.classList.add('error');
            notificationIcon.classList.add('fa-times-circle');
        } else if (type === 'info') {
            notification.classList.add('info');
            notificationIcon.classList.add('fa-info-circle');
        }

        // Reset the hide timeout
        clearTimeout(currentNotification);
        currentNotification = setTimeout(() => {
            notification.classList.remove('show');
            currentNotification = null;
        }, 3000);
    } else {
        // No notification is being shown, proceed as usual
        notificationMessage.textContent = message;

        // Reset classes
        notification.classList.remove('success', 'error', 'info');
        notificationIcon.classList.remove('fa-check-circle', 'fa-times-circle', 'fa-info-circle');

        // Add new classes based on type
        if (type === 'success') {
            notification.classList.add('success');
            notificationIcon.classList.add('fa-check-circle');
        } else if (type === 'error') {
            notification.classList.add('error');
            notificationIcon.classList.add('fa-times-circle');
        } else if (type === 'info') {
            notification.classList.add('info');
            notificationIcon.classList.add('fa-info-circle');
        }

        // Show the notification
        notification.classList.add('show');

        // Hide after 3 seconds
        currentNotification = setTimeout(() => {
            notification.classList.remove('show');
            currentNotification = null;
        }, 3000);
    }
}

/**
 * Update online/offline status indicator.
 */
function updateOnlineStatus() {
    if (!navigator.onLine) {
        statusIndicator.textContent = 'Anda offline. Data akan disimpan secara lokal.';
        statusIndicator.style.display = 'block';
        kirimSemuaButton.disabled = true; // Disable the button
    } else {
        statusIndicator.textContent = 'Anda online.';
        statusIndicator.style.display = 'block';
        setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 3000); // Hide after 3 seconds
        synchronizeTime().then(() => {
            // Automatically submit any pending entries upon reconnection
            synchronizeLocalAssets();
        });
    }
}

/**
 * Resize image using Canvas API
 * @param {HTMLImageElement} img - The image element to resize
 * @param {number} maxWidth - The maximum width of the resized image
 * @returns {Promise<Blob>} - A promise that resolves to the resized image blob
 */
function resizeImageWithCanvas(img, maxWidth) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > maxWidth) {
                height = height * (maxWidth / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');

            // Draw the image onto the canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert the canvas to a Blob (JPEG format with 70% quality)
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas is empty'));
                }
            }, 'image/jpeg', 0.7);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Preview the selected image file with client-side processing using Canvas API.
 */
function previewFile() {
    const fileInput = document.getElementById('foto');
    const file = fileInput.files[0];
    const previewImg = document.getElementById('previewImg');

    if (file) {
        const reader = new FileReader();

        reader.onloadend = function () {
            const img = new Image();
            img.src = reader.result;

            img.onload = async function () {
                try {
                    console.log('Image loaded successfully.');

                    // Resize the image using Canvas API
                    const resizedBlob = await resizeImageWithCanvas(img, 800);

                    console.log('Image resized successfully:', resizedBlob);

                    // Display the resized image in the preview
                    previewImg.src = URL.createObjectURL(resizedBlob);
                    previewImg.style.display = 'block';

                    // Store the resized image blob for later use
                    fileInput.processedBlob = resizedBlob;
                    console.log('Resized blob stored in fileInput.processedBlob');
                } catch (error) {
                    console.error('Error processing image:', error);
                    showNotification('Error processing image: ' + error.message, 'error');
                }
            };

            img.onerror = function () {
                console.error('Error loading image.');
                showNotification('Error loading image.', 'error');
            };
        };

        reader.readAsDataURL(file);
    } else {
        if (previewImg) {
            previewImg.src = '';
            previewImg.style.display = 'none';
        } else {
            console.error('previewImg is not initialized.');
        }
    }
}

/**
 * Toggle the display of the saved entries section.
 */
function toggleSavedEntries() {
    if (savedEntriesDiv.style.display === 'none' || savedEntriesDiv.style.display === '') {
        savedEntriesDiv.style.display = 'block';
        toggleSavedEntriesButton.innerHTML = '<i class="fas fa-folder-minus"></i> Sembunyikan Data Tersimpan';
    } else {
        savedEntriesDiv.style.display = 'none';
        toggleSavedEntriesButton.innerHTML = '<i class="fas fa-folder-open"></i> Tampilkan Data Tersimpan';
    }
}

// ===========================
// Data Handling Functions
// ===========================

/**
 * Retrieves saved assets from IndexedDB and organizes them by floor.
 * @returns {Promise<Object>} A promise that resolves to an object mapping floorId to a Set of saved asset identifiers.
 */
function getSavedAssets() {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = function(event) {
            const savedData = event.target.result;
            const savedAssets = {};

            savedData.forEach(entry => {
                let assetId = null;
                let assetType = null;

                if (entry.id_tipe_aset) {
                    assetId = entry.id_tipe_aset;
                    assetType = 'aset';
                } else if (entry.id_tipe_hb) {
                    assetId = entry.id_tipe_hb;
                    assetType = 'hb';
                } else if (entry.id_tipe_door) {
                    assetId = entry.id_tipe_door;
                    assetType = 'door';
                }

                if (assetId && assetType) {
                    // Find the floor for this asset
                    for (const floorId in floorAssets) {
                        const asset = floorAssets[floorId].find(a => a.id === assetId && a.type === assetType);
                        if (asset) {
                            if (!savedAssets[floorId]) {
                                savedAssets[floorId] = new Set();
                            }
                            savedAssets[floorId].add(`${assetId}_${assetType}`);
                            break;
                        }
                    }
                }
            });

            resolve(savedAssets);
        };

        request.onerror = function(event) {
            reject(event.target.errorCode);
        };
    });
}

/**
 * Updates the assets status list in the UI based on the selected floor.
 * @param {string} selectedFloorId - The ID of the selected floor.
 */
function updateAssetsStatus(selectedFloorId) {
    const assetsStatusContainer = document.getElementById('assetsStatusList');
    assetsStatusContainer.innerHTML = ''; // Clear previous content

    if (!selectedFloorId) {
        return;
    }

    getSavedAssets().then(savedAssets => {
        const floorAssetsList = floorAssets[selectedFloorId] || [];

        // Create separate lists for Aset, Box Hydrant, and Emergency Door
        const categories = {
            aset: [],
            hb: [],
            door: []
        };

        // Categorize assets
        floorAssetsList.forEach(asset => {
            categories[asset.type]?.push(asset);
        });

        // Function to create a section for a category
        function createCategorySection(title, assets, type) {
            if (assets.length === 0) return '';

            let html = `<h3>${title}</h3><ul>`;
            assets.forEach(asset => {
                const uniqueId = `${asset.id}_${asset.type}`;
                const isSaved = savedAssets[selectedFloorId]?.has(uniqueId);
                html += `<li style="color: ${isSaved ? 'green' : 'red'};">
                    ${asset.name} - ${isSaved ? 'Tersimpan' : 'Belum Tersimpan'}
                </li>`;
            });
            html += '</ul>';
            return html;
        }

        // Append categorized sections to the status container
        assetsStatusContainer.innerHTML = 
            createCategorySection('Aset', categories.aset, 'aset') +
            createCategorySection('Box Hydrant', categories.hb, 'hb') +
            createCategorySection('Emergency Door', categories.door, 'door');

    }).catch(error => {
        console.error('Error getting saved assets:', error);
        showNotification('Error mendapatkan status aset.', 'error');
    });
}


/**
 * Display saved entries from IndexedDB.
 */
function displaySavedEntries() {
    entryList.innerHTML = '';

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const savedData = event.target.result;

        savedData.forEach(function(entry) {
            // Convert timestamp to readable date
            const date = new Date(entry.client_timestamp);
            const formattedDate = date.toLocaleString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            // Build the HTML content
            let entryHtml = `
                <strong>Nama Petugas:</strong> ${entry.nama_petugas || ''} <br>
                <strong>Lantai:</strong> ${entry.nama_lantai || ''} <br>
                <!-- <strong>Waktu:</strong> ${formattedDate} <br> --> <!-- waktu di datasave -->
            `;

            if (entry.nama_aset) {
                entryHtml += `<strong>Nama Aset:</strong> ${entry.nama_aset} <br>`;
            }
            if (entry.nama_hb) {
                entryHtml += `<strong>Box Hydrant:</strong> ${entry.nama_hb} <br>`;
            }
            if (entry.nama_door) {
                entryHtml += `<strong>Emergency Door:</strong> ${entry.nama_door} <br>`;
            }

            entryHtml += `
                <strong>Kondisi:</strong> ${entry.nama_kondisi || ''} <br>
                <strong>Catatan:</strong> ${entry.catatan || ''} <br>
            `;

            // Include image preview
            if (entry.foto) {
                const url = URL.createObjectURL(entry.foto);
                entryHtml += `<img src="${url}" alt="Foto" style="max-width: 100px;" onload="URL.revokeObjectURL(this.src)"><br>`;
            }

            // Show error message if available and add Retry button
            if (entry.errorMessage) {
                entryHtml += `<div style="color: #f44336; margin-top: 10px;"><strong>Error:</strong> ${entry.errorMessage}</div>`;
                entryHtml += `<button class="retry-button" onclick="retryEntry(${entry.id})"><i class="fas fa-redo"></i> Retry</button>`;
            }

            entryHtml += `<button class="delete-button" onclick="deleteEntry(${entry.id})"><i class="fas fa-trash-alt"></i> Hapus</button>`;

            const li = document.createElement('li');
            li.innerHTML = entryHtml;
            entryList.appendChild(li);
        });

        // After displaying all entries, update assets status and Kirim Semua button
        const selectedFloorId = document.getElementById('id_tipe_lantai').value;
        updateAssetsStatus(selectedFloorId);
        debouncedUpdateKirimSemuaButton(); // Use debounced function
    };

    request.onerror = function(event) {
        console.error('Error fetching data:', event.target.errorCode);
        showNotification('Error fetching saved entries.', 'error');
    };
}

/**
 * Save form data to IndexedDB with appropriate timestamp.
 */
async function saveData() {
    // Check for time drift before saving
    if (isTimeDrifted()) {
        showNotification('Waktu perangkat Anda telah berubah. Silakan resinkronkan waktu.', 'error');
        synchronizeTime(); // Attempt to resynchronize
        return; // Prevent saving until synchronization
    }

    const formData = new FormData(inspectionForm);
    const entry = {};

    // Validate Kondisi selection
    const kondisiSelect = document.getElementById('id_kondisi');
    if (!kondisiSelect.value) {
        showNotification('Silakan pilih lantai, pilih aset, foto, lalu pilih kondisi sebelum menyimpan.', 'error');
        return; // Prevent saving
    }

    const fileInput = document.getElementById('foto');
    const processedBlob = fileInput.processedBlob;

    if (processedBlob) {
        // Store the processed image blob
        entry['foto'] = processedBlob;

        // Store form data
        formData.forEach(function(value, key) {
            if (key !== 'foto') {
                entry[key] = value;
            }
        });

        // Store the names directly
        entry['nama_petugas'] = document.querySelector('#id_user option:checked').textContent;
        entry['nama_lantai'] = document.querySelector('#id_tipe_lantai option:checked').textContent;
        entry['nama_kondisi'] = kondisiSelect.options[kondisiSelect.selectedIndex].text;

        if (entry['id_tipe_aset']) {
            entry['nama_aset'] = document.querySelector('#id_tipe_aset option:checked').textContent;
        }
        if (entry['id_tipe_hb']) {
            entry['nama_hb'] = document.querySelector('#id_tipe_hb option:checked').textContent;
        }
        if (entry['id_tipe_door']) {
            entry['nama_door'] = document.querySelector('#id_tipe_door option:checked').textContent;
        }

        // Generate a reliable timestamp
        const reliableTimestamp = getReliableTimestamp();
        entry['client_timestamp'] = reliableTimestamp;

        // Save to IndexedDB
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.add(entry);

        request.onsuccess = function(event) {
            displaySavedEntries();
            showNotification('Data berhasil disimpan secara lokal.', 'success');

            // Reset the form
            inspectionForm.reset();
            if (previewImg) { // Check if previewImg exists
                previewImg.src = '';
                previewImg.style.display = 'none';
            }

            // Reset select options
            resetSelectOptions('id_tipe_aset');
            resetSelectOptions('id_tipe_hb');
            resetSelectOptions('id_tipe_door');
            document.getElementById('id_kondisi').disabled = true;

            // Update assets status and Kirim Semua button
            const selectedFloorId = document.getElementById('id_tipe_lantai').value;
            updateAssetsStatus(selectedFloorId);
            debouncedUpdateKirimSemuaButton();
        };

        request.onerror = function(event) {
            showNotification('Error menyimpan data: ' + event.target.errorCode, 'error');
        };
    } else {
        showNotification('Silakan foto terlebih dahulu.', 'error');
    }
}

/**
 * Reset select options to original state.
 * @param {string} selectId - The ID of the select element.
 */
function resetSelectOptions(selectId) {
    const selectElement = document.getElementById(selectId);

    // Clear existing options
    selectElement.innerHTML = '<option value="" selected disabled>Pilih...</option>';

    // Append original options
    const options = originalOptions[selectId];

    options.forEach(function(option) {
        selectElement.appendChild(option.cloneNode(true));
    });

    selectElement.disabled = true;
}

/**
 * Handle selection changes and enable Kondisi.
 * @param {string} selected - The selected category ('aset', 'hb', 'door').
 */
function handleSelection(selected) {
    const kondisiSelect = document.getElementById('id_kondisi');
    kondisiSelect.disabled = false;

    if (selected === 'aset') {
        document.getElementById('id_tipe_hb').disabled = true;
        document.getElementById('id_tipe_door').disabled = true;
        document.getElementById('id_tipe_hb').value = '';
        document.getElementById('id_tipe_door').value = '';
    } else if (selected === 'hb') {
        document.getElementById('id_tipe_aset').disabled = true;
        document.getElementById('id_tipe_door').disabled = true;
        document.getElementById('id_tipe_aset').value = '';
        document.getElementById('id_tipe_door').value = '';
    } else if (selected === 'door') {
        document.getElementById('id_tipe_aset').disabled = true;
        document.getElementById('id_tipe_hb').disabled = true;
        document.getElementById('id_tipe_aset').value = '';
        document.getElementById('id_tipe_hb').value = '';
    }
}

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The time to wait in milliseconds.
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Wrap updateKirimSemuaButton with debounce
const debouncedUpdateKirimSemuaButton = debounce(updateKirimSemuaButton, 300);

/**
 * Filter dropdown options based on selected lantai.
 */
function filterOptionsByLantai() {
    const selectedLantaiId = document.getElementById('id_tipe_lantai').value;
    filterDropdownOptions('id_tipe_aset', selectedLantaiId);
    filterDropdownOptions('id_tipe_hb', selectedLantaiId);
    filterDropdownOptions('id_tipe_door', selectedLantaiId);

    if (selectedLantaiId) {
        document.getElementById('assetsStatus').style.display = 'block';
    } else {
        document.getElementById('assetsStatus').style.display = 'none';
    }

    updateAssetsStatus(selectedLantaiId);
    updateKirimSemuaButton(true); // Notify user only when they select a floor
}

/**
 * Filter dropdown options based on selected lantai.
 */
function filterDropdownOptions(selectId, lantaiId) {
    const selectElement = document.getElementById(selectId);

    // Clear existing options
    selectElement.innerHTML = '<option value="" selected disabled>Pilih...</option>';

    // Get the original options
    const options = originalOptions[selectId];

    options.forEach(function(option) {
        if (option.getAttribute('data-lantai') === lantaiId) {
            selectElement.appendChild(option.cloneNode(true));
        }
    });

    selectElement.disabled = false;
}

// ===========================
// Data Submission Functions
// ===========================

/**
 * Submit all saved entries to the server.
 */
async function handleSubmitAll() {
    if (!navigator.onLine) {
        showNotification('Anda sedang offline. Tidak dapat mengirim data.', 'error');
        return;
    }

    try {
        const savedAssets = await getSavedAssets();
        let canEnable = false;

        for (const floorId in floorAssets) {
            const totalAssets = floorAssets[floorId].length;
            const savedCount = savedAssets[floorId] ? savedAssets[floorId].size : 0;
            if (savedCount === totalAssets) {
                canEnable = true;
                break;
            }
        }

        if (!canEnable) {
            showNotification('Ada aset yang belum direkam. Silakan rekam semua aset pada setidaknya satu lantai sebelum mengirim.', 'error');
            return;
        }

        // Proceed with submission
        kirimSemuaButton.disabled = true;
        kirimSemuaSpinner.style.display = 'inline-block';

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            let entriesToSubmit = event.target.result;
            // Sort entries by client_timestamp (assuming earlier entries first)
            entriesToSubmit.sort((a, b) => new Date(a.client_timestamp) - new Date(b.client_timestamp));
            
            if (entriesToSubmit.length === 0) {
                kirimSemuaButton.disabled = false;
                kirimSemuaSpinner.style.display = 'none';
                showNotification('Tidak ada data tersimpan untuk dikirim.', 'info');
                return;
            }
        
            submitEntries(entriesToSubmit);
        };
        
        request.onerror = function(event) {
            kirimSemuaButton.disabled = false;
            kirimSemuaSpinner.style.display = 'none';
            console.error('Error fetching entries for submission:', event.target.errorCode);
            showNotification('Error mengambil data untuk pengiriman.', 'error');
        };
    } catch (error) {
        console.error('Error during Kirim Semua:', error);
        showNotification('Terjadi kesalahan saat memeriksa status aset.', 'error');
    }
}

/**
 * Submit entries in batches with a retry mechanism.
 * @param {Array} entries - Array of entries to submit.
 */
function submitEntries(entries) {
    const batchSize = 5;         // Process 5 entries at a time
    const maxRetries = 3;          // Maximum number of retry attempts per entry
    const initialRetryDelay = 1000; // 1 second initial delay

    // Helper function to submit a single entry with retry logic.
    function submitEntryWithRetry(entry, attempt = 0) {
        return new Promise((resolve) => {
            const formData = new FormData();
            // Append the image file.
            formData.append('foto', entry.foto, 'image.jpg');
            // Append the other fields.
            Object.entries(entry).forEach(([key, value]) => {
                if (!['foto', 'errorMessage', 'id'].includes(key) &&
                    !key.startsWith('nama_') && key !== 'client_timestamp') {
                    formData.append(key, value);
                }
            });
            // Append the client-assigned timestamp.
            formData.append('clientTimestamp', entry.client_timestamp);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload', true);
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    let response;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        response = { success: false, message: 'Invalid server response.' };
                    }
                    if (response.success) {
                        // Successfully submitted: remove the entry.
                        deleteEntry(entry.id, false);
                        resolve(true);
                    } else {
                        // Server responded with an error.
                        if (attempt < maxRetries) {
                            setTimeout(() => {
                                submitEntryWithRetry(entry, attempt + 1).then(resolve);
                            }, initialRetryDelay * Math.pow(2, attempt));
                        } else {
                            entry.errorMessage = response.message || 'Unknown error';
                            updateFailedEntry(entry);
                            resolve(false);
                        }
                    }
                } else {
                    // HTTP error.
                    if (attempt < maxRetries) {
                        setTimeout(() => {
                            submitEntryWithRetry(entry, attempt + 1).then(resolve);
                        }, initialRetryDelay * Math.pow(2, attempt));
                    } else {
                        entry.errorMessage = xhr.statusText || `HTTP Error: ${xhr.status}`;
                        updateFailedEntry(entry);
                        resolve(false);
                    }
                }
            };
            xhr.onerror = function () {
                if (attempt < maxRetries) {
                    setTimeout(() => {
                        submitEntryWithRetry(entry, attempt + 1).then(resolve);
                    }, initialRetryDelay * Math.pow(2, attempt));
                } else {
                    entry.errorMessage = 'Network error';
                    updateFailedEntry(entry);
                    resolve(false);
                }
            };
            xhr.send(formData);
        });
    }

    // Process one batch of entries concurrently.
    function processBatch(batch) {
        return Promise.all(batch.map(entry => submitEntryWithRetry(entry)));
    }

    // Process all batches sequentially.
    async function processAllBatches() {
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            await processBatch(batch);
        }
    }

    // Disable the "Kirim Semua" button and show a spinner during submission.
    kirimSemuaButton.disabled = true;
    kirimSemuaSpinner.style.display = 'inline-block';

    processAllBatches().then(() => {
        kirimSemuaButton.disabled = false;
        kirimSemuaSpinner.style.display = 'none';
        displaySavedEntries();
        showNotification('Data submitted with batch processing and retries.', 'success');
    });
}

/**
 * Retry submitting a single failed entry.
 * @param {number} id - The ID of the entry to retry.
 */
function retryEntry(id) {
    if (!navigator.onLine) {
        showNotification('Anda sedang offline. Tidak dapat mengirim data.', 'error');
        return;
    }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const getRequest = objectStore.get(id);

    getRequest.onsuccess = function(event) {
        const entry = event.target.result;

        // Clear previous error message
        delete entry.errorMessage;

        const formData = new FormData();

        // Append the image file if available
        if (entry.foto) {
            formData.append('foto', entry.foto, 'image.jpg');
        } else {
            console.error('No photo available for entry ID:', id);
            showNotification('Tidak ada foto yang tersedia untuk dikirim.', 'error');
            return;
        }

        // Append other fields
        Object.entries(entry).forEach(function([key, value]) {
            if (!['foto', 'errorMessage', 'id'].includes(key) && !key.startsWith('nama_') && key !== 'client_timestamp') {
                formData.append(key, value);
            }
        });

        formData.append('clientTimestamp', entry.client_timestamp);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                let response;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.error('Invalid JSON response:', xhr.responseText);
                    response = { success: false, message: 'Invalid server response.' };
                }

                if (response.success) {
                    // Remove the entry from IndexedDB
                    deleteEntry(id, false);
                    displaySavedEntries();
                    showNotification('Data berhasil dikirim ke server.', 'success');
                } else {
                    // Handle server-side validation errors
                    entry.errorMessage = response.message || 'Unknown error';
                    updateFailedEntry(entry);
                }
            } else {
                // Handle HTTP errors
                entry.errorMessage = xhr.statusText || `HTTP Error: ${xhr.status}`;
                updateFailedEntry(entry);
            }
        };

        xhr.onerror = function () {
            console.error('Network error during retry.');
            entry.errorMessage = 'Network error';
            updateFailedEntry(entry);
        };

        xhr.send(formData);
    };

    getRequest.onerror = function(event) {
        console.error('Error retrieving entry:', event.target.errorCode);
        showNotification('Error mengambil data entry.', 'error');
    };
}

/**
 * Delete an entry from IndexedDB.
 * @param {number} id - The ID of the entry to delete.
 * @param {boolean} showNotif - Whether to show a notification after deletion.
 */
function deleteEntry(id, showNotif = true) {
    console.log('deleteEntry called with id:', id, 'showNotif:', showNotif);
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = function(event) {
        displaySavedEntries();
        if (showNotif) {
            showNotification('Entry terhapus.', 'success');
        }

        // Update assets status and Kirim Semua button
        const selectedFloorId = document.getElementById('id_tipe_lantai').value;
        updateAssetsStatus(selectedFloorId);
        debouncedUpdateKirimSemuaButton();
    };

    request.onerror = function(event) {
        console.error('Error deleting entry:', event.target.errorCode);
        if (showNotif) {
            showNotification('Error menghapus entry.', 'error');
        }
    };
}

/**
 * Update a failed entry with an error message.
 * @param {Object} entry - The entry object to update.
 */
function updateFailedEntry(entry) {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const updateRequest = objectStore.put(entry);

    updateRequest.onsuccess = function() {
        displaySavedEntries();
        showNotification(`Error mengirim entry: ${entry.errorMessage}`, 'error');
    };

    updateRequest.onerror = function(event) {
        console.error('Error updating entry:', event.target.errorCode);
        showNotification('Error memperbarui entry.', 'error');
    };
}

/**
 * Update the state of the "Kirim Semua" button based on saved assets.
 */
let previousCanEnable = null; // Track the previous state

function updateKirimSemuaButton(notify = false) {
    getSavedAssets().then(savedAssets => {
        let canEnable = false;

        for (const floorId in floorAssets) {
            const totalAssets = floorAssets[floorId].length;
            const savedCount = savedAssets[floorId] ? savedAssets[floorId].size : 0;
            if (savedCount === totalAssets) {
                canEnable = true;
                break;
            }
        }

        kirimSemuaButton.disabled = !canEnable;

        // Show notification only if notify is true (user selected a floor)
        if (notify && !canEnable) {
            showNotification('Di lantai ini belum semua aset terekam, mohon perhatikan daftar aset.', 'info');
        }
    }).catch(error => {
        console.error('Error updating Kirim Semua button:', error);
    });
}

// ===========================
// Event Listeners for Online/Offline
// ===========================
window.addEventListener('online', () => {
    updateOnlineStatus();
    synchronizeTime(); // Re-synchronize when back online
});

window.addEventListener('offline', updateOnlineStatus);

// ===========================
// Service Worker Registration
// ===========================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    .then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(function(err) {
        console.log('Service Worker registration failed:', err);
    });
}

// ===========================
// Initial Load and Periodic Synchronization
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    entryList = document.getElementById('entryList');
    savedEntriesDiv = document.getElementById('savedEntries');
    toggleSavedEntriesButton = document.getElementById('toggleSavedEntriesButton');
    kirimSemuaButton = document.getElementById('kirimSemuaButton');
    kirimSemuaSpinner = document.getElementById('kirimSemuaSpinner');
    statusIndicator = document.getElementById('statusIndicator');
    notification = document.getElementById('notification');
    notificationIcon = notification.querySelector('.icon');
    notificationMessage = notification.querySelector('.message');
    saveButton = document.getElementById('saveButton');
    inspectionForm = document.getElementById('inspectionForm');
    previewImg = document.getElementById('previewImg');
    assetsStatusList = document.getElementById('assetsStatusList'); // New element

    // Initialize IndexedDB
    initDB();

    // Initialize Time Synchronization
    initializeTimeSync();

    // Store original options for dependent selects and build floorAssets
    ['id_tipe_aset', 'id_tipe_hb', 'id_tipe_door'].forEach(function(selectId) {
        const selectElement = document.getElementById(selectId);
        originalOptions[selectId] = Array.from(selectElement.options);

        Array.from(selectElement.options).forEach(option => {
            const floorId = option.getAttribute('data-lantai');
            const assetId = option.value;
            const assetName = option.textContent;
            const assetType = selectId.replace('id_tipe_', ''); // Extract type: aset, hb, door

            if (floorId) { // Ensure floorId exists
                if (!floorAssets[floorId]) {
                    floorAssets[floorId] = [];
                }
                floorAssets[floorId].push({
                    id: assetId,
                    name: assetName,
                    type: assetType
                });
            }
        });
    });

    // Initial online status update
    updateOnlineStatus();

    // Periodic synchronization every hour
    setInterval(() => {
        if (navigator.onLine) {
            synchronizeTime();
        }
    }, 60 * 60 * 1000); // Every hour

    // Set up event listeners
    toggleSavedEntriesButton.addEventListener('click', toggleSavedEntries);
    kirimSemuaButton.addEventListener('click', handleSubmitAll);
    saveButton.addEventListener('click', saveData);
    document.getElementById('foto').addEventListener('change', previewFile);

    // Attach event listeners for selects
    document.getElementById('id_tipe_lantai').addEventListener('change', filterOptionsByLantai);
    document.getElementById('id_tipe_aset').addEventListener('change', function() { handleSelection('aset'); });
    document.getElementById('id_tipe_hb').addEventListener('change', function() { handleSelection('hb'); });
    document.getElementById('id_tipe_door').addEventListener('change', function() { handleSelection('door'); });
});

/**
 * Initialize time synchronization based on online status.
 */
async function initializeTimeSync() {
    if (navigator.onLine) {
        await synchronizeTime();
    } else {
        // Attempt to use previously stored offset and reference points
        const storedOffset = parseInt(localStorage.getItem('serverTimeOffset'), 10);
        if (!isNaN(storedOffset)) {
            timeOffset = storedOffset;
            const storedLastSyncServerTime = parseInt(localStorage.getItem('lastSyncServerTime'), 10);
            const storedLastSyncPerformanceTime = parseFloat(localStorage.getItem('lastSyncPerformanceTime'));

            if (!isNaN(storedLastSyncServerTime) && !isNaN(storedLastSyncPerformanceTime)) {
                lastSyncServerTime = storedLastSyncServerTime;
                lastSyncPerformanceTime = storedLastSyncPerformanceTime;
            }
        } else {
            // Default to zero offset if no synchronization has occurred
            timeOffset = 0;
            lastSyncServerTime = Date.now();
            lastSyncPerformanceTime = performance.now();
            localStorage.setItem('lastSyncServerTime', lastSyncServerTime);
            localStorage.setItem('lastSyncPerformanceTime', lastSyncPerformanceTime);
        }

        // Initialize lastTimestamp if not set
        if (!localStorage.getItem(LAST_TIMESTAMP_KEY)) {
            localStorage.setItem(LAST_TIMESTAMP_KEY, lastSyncServerTime);
        }
    }
}

/**
 * Synchronize locally saved assets with the server.
 * This function is called after successful time synchronization.
 */
async function synchronizeLocalAssets() {
    const localAssets = JSON.parse(localStorage.getItem('localAssets')) || [];
    if (localAssets.length === 0) {
        console.log('No local assets to synchronize.');
        return;
    }

    console.log(`Synchronizing ${localAssets.length} local assets with the server...`);

    for (const asset of localAssets) {
        try {
            const formData = new FormData();
            formData.append('foto', asset.foto, 'image.jpg');

            // Append other fields
            Object.entries(asset).forEach(([key, value]) => {
                if (!['foto', 'errorMessage', 'id'].includes(key) && !key.startsWith('nama_') && key !== 'client_timestamp') {
                    formData.append(key, value);
                }
            });

            formData.append('clientTimestamp', asset.client_timestamp);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const responseData = await response.json();
            if (responseData.success) {
                deleteEntry(asset.id, false);
                console.log('Asset synchronized:', asset);
            } else {
                asset.errorMessage = responseData.message || 'Unknown error';
                updateFailedEntry(asset);
            }
        } catch (error) {
            console.error('Error synchronizing asset:', asset, error);
            asset.errorMessage = error.message || 'Unknown error';
            updateFailedEntry(asset);
        }
    }

    localStorage.removeItem('localAssets');
    console.log('All local assets have been synchronized and cleared from local storage.');
}


//logout

