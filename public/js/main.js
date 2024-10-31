// main.js

// IIFE for Database Operations
const dbModule = (function() {
    let db;
    const dbName = 'inspectionDB';
    const dbVersion = 2; // Increment version to add 'appState' store
    const storeName = 'inspections';
    const appStateStore = 'appState';

    /**
     * Initializes the IndexedDB database.
     * @returns {Promise} Resolves when the database is successfully opened.
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = function(event) {
                console.error('Database error:', event.target.errorCode);
                handleError('Database Error', event.target.errorCode);
                reject(event.target.errorCode);
            };

            request.onupgradeneeded = function(event) {
                db = event.target.result;

                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains(appStateStore)) {
                    db.createObjectStore(appStateStore, { keyPath: 'key' });
                }
            };

            request.onsuccess = function(event) {
                db = event.target.result;
                displaySavedEntries();
                resolve(db);
            };
        });
    }

    /**
     * Adds a new entry to the IndexedDB.
     * @param {Object} entry - The entry object to add.
     * @returns {Promise} Resolves with the added entry's ID.
     */
    function addEntry(entry) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(entry);

            request.onsuccess = function() {
                resolve(request.result);
            };

            request.onerror = function(event) {
                console.error('Error adding entry:', event.target.errorCode);
                handleError('DB Add Error', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    /**
     * Retrieves all entries from the IndexedDB.
     * @returns {Promise} Resolves with an array of all entries.
     */
    function getAllEntries() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.getAll();

            request.onsuccess = function(event) {
                resolve(event.target.result);
            };

            request.onerror = function(event) {
                console.error('Error fetching entries:', event.target.errorCode);
                handleError('DB Fetch Error', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    /**
     * Deletes an entry from the IndexedDB.
     * @param {number} id - The ID of the entry to delete.
     * @returns {Promise} Resolves when the entry is successfully deleted.
     */
    function deleteEntry(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.delete(id);

            request.onsuccess = function() {
                resolve();
            };

            request.onerror = function(event) {
                console.error('Error deleting entry:', event.target.errorCode);
                handleError('DB Delete Error', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    /**
     * Retrieves a specific entry by ID.
     * @param {number} id - The ID of the entry to retrieve.
     * @returns {Promise} Resolves with the entry object or undefined if not found.
     */
    function getEntryById(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.get(id);

            request.onsuccess = function(event) {
                resolve(event.target.result);
            };

            request.onerror = function(event) {
                console.error('Error getting entry:', event.target.errorCode);
                handleError('DB Get Error', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    /**
     * Retrieves a value from the appState store.
     * @param {string} key - The key to retrieve.
     * @returns {Promise} Resolves with the value or undefined if not found.
     */
    function getAppState(key) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([appStateStore], 'readonly');
            const objectStore = transaction.objectStore(appStateStore);
            const request = objectStore.get(key);

            request.onsuccess = function(event) {
                if (event.target.result) {
                    resolve(event.target.result.value);
                } else {
                    resolve(undefined);
                }
            };

            request.onerror = function(event) {
                console.error('Error getting app state:', event.target.errorCode);
                handleError('DB Get AppState Error', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    /**
     * Sets a value in the appState store.
     * @param {string} key - The key to set.
     * @param {*} value - The value to set.
     * @returns {Promise} Resolves when the value is successfully set.
     */
    function setAppState(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([appStateStore], 'readwrite');
            const objectStore = transaction.objectStore(appStateStore);
            const request = objectStore.put({ key, value });

            request.onsuccess = function() {
                resolve();
            };

            request.onerror = function(event) {
                console.error('Error setting app state:', event.target.errorCode);
                handleError('DB Set AppState Error', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    return {
        initDB,
        addEntry,
        getAllEntries,
        deleteEntry,
        getEntryById,
        getAppState,
        setAppState
    };
})();

// IIFE for UI Operations
const uiModule = (function() {
    const entryList = document.getElementById('entryList');
    const savedEntriesDiv = document.getElementById('savedEntries');
    const toggleSavedEntriesButton = document.getElementById('toggleSavedEntriesButton');
    const kirimSemuaButton = document.getElementById('kirimSemuaButton');
    const kirimSemuaSpinner = document.getElementById('kirimSemuaSpinner');
    const statusIndicator = document.getElementById('statusIndicator');
    const notification = document.getElementById('notification');
    const notificationIcon = notification.querySelector('.icon');
    const notificationMessage = notification.querySelector('.message');
    const previewImg = document.getElementById('previewImg');

    // Store original options for dependent selects
    const originalOptions = {
        id_tipe_aset: [],
        id_tipe_hb: [],
        id_tipe_door: []
    };

    /**
     * Initializes UI components and event listeners.
     */
    function initUI() {
        // Store original options for dependent selects
        ['id_tipe_aset', 'id_tipe_hb', 'id_tipe_door'].forEach(function(selectId) {
            const selectElement = document.getElementById(selectId);
            originalOptions[selectId] = Array.from(selectElement.options);
        });

        // Setup event listeners
        toggleSavedEntriesButton.addEventListener('click', toggleSavedEntries);
        kirimSemuaButton.addEventListener('click', handleSubmitAll);
        kirimSemuaButton.addEventListener('touchstart', handleSubmitAll);
        document.getElementById('saveButton').addEventListener('click', handleSaveLocal);
        document.getElementById('foto').addEventListener('change', previewFile);
        document.getElementById('id_tipe_lantai').addEventListener('change', filterOptionsByLantai);
        document.getElementById('id_tipe_aset').addEventListener('change', () => handleSelection('aset'));
        document.getElementById('id_tipe_hb').addEventListener('change', () => handleSelection('hb'));
        document.getElementById('id_tipe_door').addEventListener('change', () => handleSelection('door'));
    }

    /**
     * Displays a notification to the user.
     * @param {string} message - The message to display.
     * @param {string} type - The type of notification ('success', 'error', 'info').
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
     * Toggles the visibility of the saved entries section.
     */
    function toggleSavedEntries() {
        if (savedEntriesDiv.style.display === 'none') {
            savedEntriesDiv.style.display = 'block';
            toggleSavedEntriesButton.innerHTML = '<i class="fas fa-folder-minus"></i> Sembunyikan Data Tersimpan';
        } else {
            savedEntriesDiv.style.display = 'none';
            toggleSavedEntriesButton.innerHTML = '<i class="fas fa-folder-open"></i> Tampilkan Data Tersimpan';
        }
    }

    /**
     * Previews the selected image file.
     */
    function previewFile() {
        const file = document.getElementById('foto').files[0];

        if (file) {
            const reader = new FileReader();
            reader.onloadend = function () {
                previewImg.src = reader.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewImg.src = "";
            previewImg.style.display = 'none';
        }
    }

    /**
     * Handles saving the form data locally to IndexedDB.
     */
    async function handleSaveLocal() {
        const formElement = document.getElementById('inspectionForm');
        const formData = new FormData(formElement);
        const entry = {};

        // Validate Kondisi selection
        const kondisiSelect = document.getElementById('id_kondisi');
        if (!kondisiSelect.value) {
            showNotification('Silakan pilih lantai, pilih aset, foto, lalu pilih kondisi sebelum menyimpan.', 'error');
            return; // Prevent saving
        }

        // Read the file
        const fileInput = document.getElementById('foto');
        const file = fileInput.files[0];

        if (file) {
            // Optionally, resize the image before saving
            // Uncomment the following lines to enable image resizing
            /*
            resizeImage(file, async function(resizedBlob) {
                entry['foto'] = resizedBlob;
                await saveEntry(formData, entry);
            });
            */

            // If not resizing, store the original file
            entry['foto'] = file;

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

            // Add timestamp when saving the data
            let timestamp;
            if (navigator.onLine) {
                // When online, use Date().toISOString()
                timestamp = new Date().toISOString();
            } else {
                // When offline, calculate timestamp based on stored delta and performance.now()
                const timeDelta = await dbModule.getAppState('timeDelta');
                const serverTimeAtFetch = await dbModule.getAppState('serverTimeAtFetch');
                const performanceAtFetch = await dbModule.getAppState('performanceAtFetch');

                if (timeDelta !== undefined && serverTimeAtFetch !== undefined && performanceAtFetch !== undefined) {
                    const currentPerformanceNow = performance.now();
                    const elapsed = currentPerformanceNow - performanceAtFetch;
                    const estimatedServerTime = new Date(serverTimeAtFetch).getTime() + elapsed;
                    timestamp = new Date(estimatedServerTime).toISOString();
                } else {
                    // If no delta stored, fallback to client Date
                    timestamp = new Date().toISOString();
                }
            }

            entry['timestamp'] = timestamp;

            try {
                await dbModule.addEntry(entry);
                displaySavedEntries();
                showNotification('Data berhasil disimpan secara lokal.', 'success');

                // Reset the form
                formElement.reset();
                previewImg.src = '';
                previewImg.style.display = 'none';

                // Reset select options
                resetSelectOptions('id_tipe_aset');
                resetSelectOptions('id_tipe_hb');
                resetSelectOptions('id_tipe_door');
                document.getElementById('id_kondisi').disabled = true;
            } catch (error) {
                showNotification('Error menyimpan data: ' + error, 'error');
            }
        } else {
            showNotification('Silakan foto terlebih dahulu.', 'error');
        }
    }

    /**
     * Resets a dropdown to its original state.
     * @param {string} selectId - The ID of the select element to reset.
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
     * Filters asset type dropdowns based on the selected floor.
     */
    function filterOptionsByLantai() {
        const selectedLantaiId = document.getElementById('id_tipe_lantai').value;
        filterDropdownOptions('id_tipe_aset', selectedLantaiId);
        filterDropdownOptions('id_tipe_hb', selectedLantaiId);
        filterDropdownOptions('id_tipe_door', selectedLantaiId);
    }

    /**
     * Filters a specific dropdown based on the selected floor ID.
     * @param {string} selectId - The ID of the select element to filter.
     * @param {string} lantaiId - The selected floor ID.
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

    /**
     * Handles selection of asset types, ensuring only one category is active.
     * @param {string} selected - The selected asset type category ('aset', 'hb', 'door').
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
     * Displays all saved entries from IndexedDB in the UI.
     */
    async function displaySavedEntries() {
        entryList.innerHTML = '';

        try {
            const savedData = await dbModule.getAllEntries();

            savedData.forEach(function(entry) {
                // Format the timestamp to a more readable format
                const formattedTimestamp = new Date(entry.timestamp).toLocaleString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                // Build the HTML content
                let entryHtml = `
                    <strong>Nama Petugas:</strong> ${entry.nama_petugas || ''} <br>
                    <strong>Lantai:</strong> ${entry.nama_lantai || ''} <br>
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
                    <strong>Waktu Simpan:</strong> ${formattedTimestamp} <br>
                `;

                // Include image preview
                if (entry.foto) {
                    const url = URL.createObjectURL(entry.foto);
                    entryHtml += `<img src="${url}" alt="Foto" style="max-width: 100px;"><br>`;
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
        } catch (error) {
            showNotification('Error fetching saved entries.', 'error');
        }
    }

    /**
     * Handles submitting all saved entries to the server.
     */
    async function handleSubmitAll() {
        if (!navigator.onLine) {
            showNotification('Anda sedang offline. Tidak dapat mengirim data.', 'error');
            return;
        }

        // Show the spinner and disable the Kirim Semua button
        kirimSemuaButton.disabled = true;
        kirimSemuaSpinner.style.display = 'inline-block';

        try {
            const entriesToSubmit = await dbModule.getAllEntries();

            if (entriesToSubmit.length === 0) {
                kirimSemuaButton.disabled = false; // Re-enable the button
                kirimSemuaSpinner.style.display = 'none'; // Hide the spinner
                showNotification('Tidak ada data tersimpan untuk dikirim.', 'info');
                return;
            }

            await submitEntries(entriesToSubmit);
        } catch (error) {
            kirimSemuaButton.disabled = false; // Re-enable the button
            kirimSemuaSpinner.style.display = 'none'; // Hide the spinner
            console.error('Error fetching entries for submission:', error);
            showNotification('Error mengambil data untuk pengiriman.', 'error');
        }
    }

    /**
     * Submits an array of entries to the server sequentially.
     * @param {Array} entries - The array of entries to submit.
     */
    async function submitEntries(entries) {
        let index = 0;
        const failedEntries = [];

        while (index < entries.length) {
            const entry = entries[index];
            const formData = new FormData();

            // Append the image file
            formData.append('foto', entry.foto);

            // Append other fields
            Object.entries(entry).forEach(function([key, value]) {
                if (!['foto', 'errorMessage', 'id', 'timestamp'].includes(key) && !key.startsWith('nama_')) {
                    formData.append(key, value);
                }
            });

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    console.log('Successfully submitted entry id:', entry.id);
                    await dbModule.deleteEntry(entry.id);
                } else {
                    const errorText = await response.text();
                    handleError(response.status, response.statusText);
                    entry.errorMessage = response.statusText;
                    await dbModule.deleteEntry(entry.id);
                    failedEntries.push(entry);
                }
            } catch (error) {
                console.error('Network error during submission:', error);
                handleError('Network Error', 'A network error occurred during submission.');
                entry.errorMessage = 'Network error';
                failedEntries.push(entry);
            }

            index++;
        }

        // Update UI after submission
        await displaySavedEntries();
        kirimSemuaButton.disabled = false; // Re-enable the button
        kirimSemuaSpinner.style.display = 'none'; // Hide the spinner

        if (failedEntries.length > 0) {
            showNotification(`${failedEntries.length} entri gagal dikirim. Anda dapat mencoba mengirim ulang secara individu.`, 'error');
        } else {
            showNotification('Data berhasil dikirim ke server.', 'success');
        }
    }

    /**
     * Optional: Function to resize images before saving.
     * Uncomment and integrate if image resizing is desired.
     */
    /*
    function resizeImage(file, callback) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Set desired dimensions
                const maxWidth = 800;
                const maxHeight = 800;
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(function(blob) {
                    callback(blob);
                }, 'image/jpeg', 0.7); // Adjust quality as needed
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    */

    return {
        initUI,
        showNotification,
        toggleSavedEntries,
        previewFile,
        handleSaveLocal,
        handleSubmitAll,
        displaySavedEntries
    };
})();

// IIFE for Network Operations
const networkModule = (function() {
    /**
     * Registers the service worker for offline capabilities.
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(function(err) {
                console.log('Service Worker registration failed:', err);
            });
        }
    }

    /**
     * Fetches the server time by making a HEAD request to the server.
     * @returns {Promise<Date>} Resolves with the server time as a Date object.
     */
    function fetchServerTime() {
        return new Promise((resolve, reject) => {
            fetch('/', { method: 'HEAD' })
            .then(response => {
                const serverDate = response.headers.get('Date');
                if (serverDate) {
                    resolve(new Date(serverDate));
                } else {
                    reject('No Date header found');
                }
            })
            .catch(error => {
                console.error('Failed to fetch server time:', error);
                reject(error);
            });
        });
    }

    return {
        registerServiceWorker,
        fetchServerTime
    };
})();

/**
 * Handles errors by displaying appropriate notifications based on error type.
 * @param {number|string} errorCode - The HTTP status code or error identifier.
 * @param {string} errorMessage - The descriptive error message.
 */
function handleError(errorCode, errorMessage) {
    if (typeof errorCode === 'number') {
        switch(errorCode) {
            case 401:
                uiModule.showNotification('Unauthorized access. Please log in again.', 'error');
                // Optionally, redirect to login page
                break;
            case 403:
                uiModule.showNotification('Forbidden: You do not have permission to perform this action.', 'error');
                break;
            case 404:
                uiModule.showNotification('Resource not found.', 'error');
                break;
            case 500:
                uiModule.showNotification('Internal Server Error. Please try again later.', 'error');
                break;
            default:
                uiModule.showNotification(`Error ${errorCode}: ${errorMessage}`, 'error');
        }
    } else {
        // Handle non-HTTP errors
        uiModule.showNotification(`${errorCode}: ${errorMessage}`, 'error');
    }
    console.error(`Error ${errorCode}: ${errorMessage}`);
}

/**
 * Initializes the application.
 */
window.onload = async function() {
    uiModule.initUI();
    networkModule.registerServiceWorker();

    // Initialize IndexedDB
    try {
        await dbModule.initDB();
    } catch (error) {
        console.error('Failed to initialize the database:', error);
        uiModule.showNotification('Failed to initialize the database.', 'error');
    }

    // Listen to online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial status check
    updateOnlineStatus();

    // If online, fetch server time and set delta
    if (navigator.onLine) {
        try {
            const serverTime = await networkModule.fetchServerTime();
            const clientTime = new Date();
            const delta = serverTime.getTime() - clientTime.getTime();

            const performanceNow = performance.now();

            // Store delta and related info in appState
            await dbModule.setAppState('timeDelta', delta);
            await dbModule.setAppState('serverTimeAtFetch', serverTime.toISOString());
            await dbModule.setAppState('performanceAtFetch', performanceNow);

            console.log('Time delta set:', delta, 'ms');
        } catch (error) {
            console.error('Failed to set time delta:', error);
            uiModule.showNotification('Failed to set time delta for timestamping.', 'error');
        }
    }
}

/**
 * Updates the online/offline status indicator in the UI.
 */
function updateOnlineStatus() {
    if (!navigator.onLine) {
        document.getElementById('statusIndicator').style.display = 'block';
        document.getElementById('kirimSemuaButton').disabled = true;
    } else {
        document.getElementById('statusIndicator').style.display = 'none';
        document.getElementById('kirimSemuaButton').disabled = false;

        // When coming back online, fetch server time and update delta
        (async function() {
            try {
                const serverTime = await networkModule.fetchServerTime();
                const clientTime = new Date();
                const delta = serverTime.getTime() - clientTime.getTime();

                const performanceNow = performance.now();

                // Store delta and related info in appState
                await dbModule.setAppState('timeDelta', delta);
                await dbModule.setAppState('serverTimeAtFetch', serverTime.toISOString());
                await dbModule.setAppState('performanceAtFetch', performanceNow);

                console.log('Time delta updated:', delta, 'ms');
            } catch (error) {
                console.error('Failed to update time delta:', error);
                uiModule.showNotification('Failed to update time delta for timestamping.', 'error');
            }
        })();
    }
}

/**
 * Deletes an entry from IndexedDB and updates the UI.
 * This function is exposed to the global scope for use in HTML onclick handlers.
 * @param {number} id - The ID of the entry to delete.
 */
window.deleteEntry = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus entry ini?')) {
        return;
    }
    try {
        await dbModule.deleteEntry(id);
        uiModule.displaySavedEntries();
        uiModule.showNotification('Entry terhapus.', 'success');
    } catch (error) {
        uiModule.showNotification('Error menghapus entry.', 'error');
    }
};

/**
 * Retries submitting a failed entry to the server.
 * This function is exposed to the global scope for use in HTML onclick handlers.
 * @param {number} id - The ID of the entry to retry.
 */
window.retryEntry = async function(id) {
    if (!navigator.onLine) {
        uiModule.showNotification('Anda sedang offline. Tidak dapat mengirim data.', 'error');
        return;
    }
    try {
        const entries = await dbModule.getAllEntries();
        const entry = entries.find(e => e.id === id);
        if (!entry) {
            uiModule.showNotification('Entry tidak ditemukan.', 'error');
            return;
        }

        const formData = new FormData();

        // Append the image file
        formData.append('foto', entry.foto);

        // Append other fields
        Object.entries(entry).forEach(function([key, value]) {
            if (!['foto', 'errorMessage', 'id', 'timestamp'].includes(key) && !key.startsWith('nama_')) {
                formData.append(key, value);
            }
        });

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            console.log('Successfully retried entry id:', id);
            await dbModule.deleteEntry(id);
            uiModule.displaySavedEntries();
            uiModule.showNotification('Data berhasil dikirim ke server.', 'success');
        } else {
            const errorText = await response.text();
            handleError(response.status, response.statusText);
            entry.errorMessage = response.statusText;
            await dbModule.deleteEntry(id);
            uiModule.displaySavedEntries();
            uiModule.showNotification(`Error mengirim entry: ${entry.errorMessage}`, 'error');
        }
    } catch (error) {
        console.error('Network error during retry:', error);
        handleError('Network Error', 'A network error occurred during retry.');
        // Optionally, update the entry with the error message in IndexedDB
    }
};
