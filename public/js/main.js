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
 * Synchronize client time with server time.
 */
async function synchronizeTime() {
    try {
        const serverTimeStr = await fetchServerTime();
        const serverTime = new Date(serverTimeStr).getTime();
        const clientTime = Date.now();
        timeOffset = serverTime - clientTime;

        // Retrieve previous synchronization reference points
        const storedLastSyncServerTime = parseInt(localStorage.getItem('lastSyncServerTime'), 10);
        const storedLastSyncPerformanceTime = parseFloat(localStorage.getItem('lastSyncPerformanceTime'));

        if (!isNaN(storedLastSyncServerTime) && !isNaN(storedLastSyncPerformanceTime)) {
            lastSyncServerTime = storedLastSyncServerTime;
            lastSyncPerformanceTime = storedLastSyncPerformanceTime;
        } else {
            // Initialize if not present
            lastSyncServerTime = serverTime;
            lastSyncPerformanceTime = performance.now();
        }

        // Update reference points
        lastSyncServerTime = serverTime;
        lastSyncPerformanceTime = performance.now();

        // Store updated reference points
        localStorage.setItem('lastSyncServerTime', lastSyncServerTime);
        localStorage.setItem('lastSyncPerformanceTime', lastSyncPerformanceTime);

        console.log(`Time synchronized. Offset: ${timeOffset} ms`);

        // Update lastTimestamp to ensure monotonicity
        let lastTimestamp = parseInt(localStorage.getItem(LAST_TIMESTAMP_KEY), 10) || serverTime;
        const adjustedLastTimestamp = Math.max(lastTimestamp, serverTime);
        localStorage.setItem(LAST_TIMESTAMP_KEY, adjustedLastTimestamp);
    } catch (error) {
        console.error('Failed to synchronize time:', error);
        showNotification('Failed to synchronize time with server.', 'error');
    }
}

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
 * Get the estimated current server time based on performance.now()
 * @returns {number} Estimated server time in ms since epoch.
 */
function getCurrentServerTime() {
    const storedLastSyncServerTime = parseInt(localStorage.getItem('lastSyncServerTime'), 10);
    const storedLastSyncPerformanceTime = parseFloat(localStorage.getItem('lastSyncPerformanceTime'));

    if (isNaN(storedLastSyncServerTime) || isNaN(storedLastSyncPerformanceTime)) {
        // Fallback if not available
        return Date.now() + timeOffset;
    }

    const elapsed = performance.now() - storedLastSyncPerformanceTime;
    return storedLastSyncServerTime + elapsed + timeOffset;
}

/**
 * Detect significant time drift.
 * @returns {boolean} True if drift is significant, else false.
 */
function isTimeDrifted() {
    const expectedServerTime = getCurrentServerTime();
    const actualServerTime = Date.now() + timeOffset; // Approximation

    // Allow a small margin of error (e.g., 2 minutes)
    const drift = Math.abs(actualServerTime - expectedServerTime);
    return drift > 2 * 60 * 1000; // 2 minutes in ms
}

// ===========================
// Monotonic Timestamp Functions
// ===========================

/**
 * Generates a reliable and monotonic timestamp.
 * @returns {string} An ISO 8601 formatted timestamp.
 */
function getReliableTimestamp() {
    // Retrieve the time offset
    let offset = parseInt(localStorage.getItem('serverTimeOffset'), 10);
    if (isNaN(offset)) offset = timeOffset || 0;

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
function showNotification(message, type) {
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
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
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
        kirimSemuaButton.disabled = false; // Enable the button
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
 * Filter dropdown options based on selected lantai.
 */
function filterOptionsByLantai() {
    const selectedLantaiId = document.getElementById('id_tipe_lantai').value;
    filterDropdownOptions('id_tipe_aset', selectedLantaiId);
    filterDropdownOptions('id_tipe_hb', selectedLantaiId);
    filterDropdownOptions('id_tipe_door', selectedLantaiId);
}

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
function handleSubmitAll() {
    if (!navigator.onLine) {
        showNotification('Anda sedang offline. Tidak dapat mengirim data.', 'error');
        return;
    }

    // Show the spinner and disable the Kirim Semua button
    kirimSemuaButton.disabled = true;
    kirimSemuaSpinner.style.display = 'inline-block';

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const entriesToSubmit = event.target.result;
        if (entriesToSubmit.length === 0) {
            kirimSemuaButton.disabled = false; // Re-enable the button
            kirimSemuaSpinner.style.display = 'none'; // Hide the spinner
            showNotification('Tidak ada data tersimpan untuk dikirim.', 'info');
            return;
        }

        submitEntries(entriesToSubmit);
    };

    request.onerror = function(event) {
        kirimSemuaButton.disabled = false; // Re-enable the button
        kirimSemuaSpinner.style.display = 'none'; // Hide the spinner
        console.error('Error fetching entries for submission:', event.target.errorCode);
        showNotification('Error mengambil data untuk pengiriman.', 'error');
    };
}

/**
 * Submit entries one by one to the server.
 * @param {Array} entries - Array of entries to submit.
 */
function submitEntries(entries) {
    let index = 0;
    const failedEntries = [];

    function submitNextEntry() {
        if (index >= entries.length) {
            kirimSemuaButton.disabled = false; // Re-enable the button
            kirimSemuaSpinner.style.display = 'none'; // Hide the spinner
            displaySavedEntries();

            if (failedEntries.length > 0) {
                showNotification(`${failedEntries.length} entri gagal dikirim. Anda dapat mencoba mengirim ulang secara individu.`, 'error');
            } else {
                showNotification('Data berhasil dikirim ke server.', 'success');
            }
            return;
        }

        const entry = entries[index];
        const formData = new FormData();

        // Append the image file
        formData.append('foto', entry.foto, 'image.jpg');

        // Append other fields
        Object.entries(entry).forEach(function([key, value]) {
            if (!['foto', 'errorMessage', 'id'].includes(key) && !key.startsWith('nama_') && key !== 'client_timestamp') {
                formData.append(key, value);
            }
        });

        // Append the client-assigned timestamp as ISO string
        formData.append('clientTimestamp', entry.client_timestamp);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true); // Replace '/upload' with your actual endpoint

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    // Remove the entry from IndexedDB
                    deleteEntry(entry.id, false);
                    index++;
                    submitNextEntry();
                } else {
                    // Handle server-side validation errors
                    entry.errorMessage = response.message || 'Unknown error';
                    updateFailedEntry(entry);
                    index++;
                    submitNextEntry();
                }
            } else {
                // Handle HTTP errors
                entry.errorMessage = xhr.statusText;
                updateFailedEntry(entry);
                index++;
                submitNextEntry();
            }
        };

        xhr.onerror = function () {
            console.error('Network error during submission.');
            entry.errorMessage = 'Network error';
            updateFailedEntry(entry);
            index++;
            submitNextEntry();
        };

        xhr.send(formData);
    }

    submitNextEntry();
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

        // Append the image file
        formData.append('foto', entry.foto, 'image.jpg');

        // Append other fields
        Object.entries(entry).forEach(function([key, value]) {
            if (!['foto', 'errorMessage', 'id'].includes(key) && !key.startsWith('nama_') && key !== 'client_timestamp') {
                formData.append(key, value);
            }
        });

        // Append the client-assigned timestamp as ISO string
        formData.append('clientTimestamp', entry.client_timestamp);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true); // Replace '/upload' with your actual endpoint

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
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
                // Handle errors
                entry.errorMessage = xhr.statusText;
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

window.onload = function() {
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

    // Initialize IndexedDB
    initDB();

    // Initialize Time Synchronization
    initializeTimeSync();

    // Store original options for dependent selects
    ['id_tipe_aset', 'id_tipe_hb', 'id_tipe_door'].forEach(function(selectId) {
        const selectElement = document.getElementById(selectId);
        originalOptions[selectId] = Array.from(selectElement.options);
    });

    // Initial online status update
    updateOnlineStatus();

    // Periodic synchronization every hour
    setInterval(() => {
        if (navigator.onLine) {
            synchronizeTime();
        }
    }, 60 * 60 * 1000); // Every hour

    // Set up event listeners inside window.onload to ensure elements are available
    toggleSavedEntriesButton.addEventListener('click', toggleSavedEntries);
    kirimSemuaButton.addEventListener('click', handleSubmitAll);
    saveButton.addEventListener('click', saveData);
    document.getElementById('foto').addEventListener('change', previewFile);

    // Attach event listeners for selects
    document.getElementById('id_tipe_lantai').addEventListener('change', filterOptionsByLantai);
    document.getElementById('id_tipe_aset').addEventListener('change', function() { handleSelection('aset'); });
    document.getElementById('id_tipe_hb').addEventListener('change', function() { handleSelection('hb'); });
    document.getElementById('id_tipe_door').addEventListener('change', function() { handleSelection('door'); });
};

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
            formData.append('foto', asset.foto, 'image.jpg'); // Ensure a filename is provided

            // Append other fields
            Object.entries(asset).forEach(([key, value]) => {
                if (!['foto', 'errorMessage', 'id'].includes(key) && !key.startsWith('nama_') && key !== 'client_timestamp') {
                    formData.append(key, value);
                }
            });

            // Append the client-assigned timestamp as ISO string
            formData.append('clientTimestamp', asset.client_timestamp);

            const response = await fetch('/upload', { // Replace '/upload' with your actual endpoint
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const responseData = await response.json();
            if (responseData.success) {
                // Remove the entry from IndexedDB
                deleteEntry(asset.id, false);
                console.log('Asset synchronized:', asset);
            } else {
                // Handle server-side validation errors
                asset.errorMessage = responseData.message || 'Unknown error';
                updateFailedEntry(asset);
            }
        } catch (error) {
            console.error('Error synchronizing asset:', asset, error);
            asset.errorMessage = error.message || 'Unknown error';
            updateFailedEntry(asset);
        }
    }

    // Clear local assets after successful synchronization
    localStorage.removeItem('localAssets');
    console.log('All local assets have been synchronized and cleared from local storage.');
}
