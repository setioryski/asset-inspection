const entryList = document.getElementById('entryList');
const savedEntriesDiv = document.getElementById('savedEntries');
const toggleSavedEntriesButton = document.getElementById('toggleSavedEntriesButton');
const kirimSemuaButton = document.getElementById('kirimSemuaButton');
const kirimSemuaSpinner = document.getElementById('kirimSemuaSpinner');
const statusIndicator = document.getElementById('statusIndicator');
const notification = document.getElementById('notification');
const notificationIcon = notification.querySelector('.icon');
const notificationMessage = notification.querySelector('.message');

// IndexedDB variables
let db;
const dbName = 'inspectionDB';
const dbVersion = 1;
const storeName = 'inspections';

// Initialize IndexedDB
function initDB() {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
        showNotification('Failed to open the database.', 'error');
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const objectStore = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        displaySavedEntries();
    };
}

// Call initDB when the window loads
window.onload = function() {
    initDB();

    // Store original options for dependent selects
    ['id_tipe_aset', 'id_tipe_hb', 'id_tipe_door'].forEach(function(selectId) {
        const selectElement = document.getElementById(selectId);
        originalOptions[selectId] = Array.from(selectElement.options);
    });


    // Listen to online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    updateOnlineStatus(); // Initial status
};

// Store original options for dependent selects
const originalOptions = {
    id_tipe_aset: [],
    id_tipe_hb: [],
    id_tipe_door: []
};

// Update online/offline status indicator
function updateOnlineStatus() {
if (!navigator.onLine) {
statusIndicator.style.display = 'block';
kirimSemuaButton.disabled = true; // Disable the button
} else {
statusIndicator.style.display = 'none';
kirimSemuaButton.disabled = false; // Enable the button
}
}


// Show notification with icons
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

// Toggle the display of the Data Tersimpan section
toggleSavedEntriesButton.addEventListener('click', function () {
    if (savedEntriesDiv.style.display === 'none') {
        savedEntriesDiv.style.display = 'block';
        toggleSavedEntriesButton.textContent = 'Sembunyikan Data Tersimpan';
        toggleSavedEntriesButton.innerHTML = '<i class="fas fa-folder-minus"></i> Sembunyikan Data Tersimpan';
    } else {
        savedEntriesDiv.style.display = 'none';
        toggleSavedEntriesButton.textContent = 'Tampilkan Data Tersimpan';
        toggleSavedEntriesButton.innerHTML = '<i class="fas fa-folder-open"></i> Tampilkan Data Tersimpan';
    }
});

function previewFile() {
    const preview = document.getElementById('previewImg');
    const file = document.getElementById('foto').files[0];
    const reader = new FileReader();

    reader.onloadend = function () {
        preview.src = reader.result;
        preview.style.display = 'block';
    };

    if (file) {
        reader.readAsDataURL(file);
    } else {
        preview.src = "";
        preview.style.display = 'none';
    }
}

// Save form data to IndexedDB
document.getElementById('saveButton').addEventListener('click', function () {
    const formElement = document.getElementById('inspectionForm');
    const formData = new FormData(formElement);
    const entry = {};

    // Validate Kondisi selection
    const kondisiSelect = document.getElementById('id_kondisi');
    if (!kondisiSelect.value) {
        showNotification('Silakan pilih kondisi sebelum menyimpan.', 'error');
        return; // Prevent saving
    }

    // Read the file
    const fileInput = document.getElementById('foto');
    const file = fileInput.files[0];

    if (file) {
        // Optionally, resize the image before saving (improves storage and upload times)
        // Uncomment the following lines to enable image resizing
        /*
        resizeImage(file, function(resizedBlob) {
            entry['foto'] = resizedBlob;
            saveEntry(formData, entry);
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

        // Save to IndexedDB
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.add(entry);

        request.onsuccess = function(event) {
            displaySavedEntries();
            showNotification('Data berhasil disimpan secara lokal.', 'success');

            // Reset the form
            formElement.reset();
            document.getElementById('previewImg').src = '';
            document.getElementById('previewImg').style.display = 'none';

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
        showNotification('Silakan pilih file foto terlebih dahulu.', 'error');
    }
});

// Optional: Function to resize images before saving
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

// Function to reset select options to original state
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

// Display saved entries from IndexedDB
function displaySavedEntries() {
    entryList.innerHTML = '';

    const transaction = db.transaction([storeName], 'readonly');
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const savedData = event.target.result;

        savedData.forEach(function(entry) {
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
    };

    request.onerror = function(event) {
        console.error('Error fetching data:', event.target.errorCode);
        showNotification('Error fetching saved entries.', 'error');
    };
}

// Delete an entry from IndexedDB
function deleteEntry(id, showNotif = true) {
console.log('deleteEntry called with id:', id, 'showNotif:', showNotif);
const transaction = db.transaction([storeName], 'readwrite');
const objectStore = transaction.objectStore(storeName);
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

// Retry a single failed entry
function retryEntry(id) {
if (!navigator.onLine) {
showNotification('Anda sedang offline. Tidak dapat mengirim data.', 'error');
return;
}
const transaction = db.transaction([storeName], 'readwrite');
const objectStore = transaction.objectStore(storeName);
const getRequest = objectStore.get(id);

getRequest.onsuccess = function(event) {
const entry = event.target.result;

// Clear previous error message
delete entry.errorMessage;

const formData = new FormData();

// Append the image file
formData.append('foto', entry.foto);

// Append other fields
Object.entries(entry).forEach(([key, value]) => {
    if (!['foto', 'errorMessage', 'id'].includes(key) && !key.startsWith('nama_')) {
        formData.append(key, value);
    }
});

const xhr = new XMLHttpRequest();
xhr.open('POST', '/upload', true);

xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
        console.log('Successfully retried entry id:', id); // Debugging line
        // Remove the entry from IndexedDB without showing notification
        deleteEntry(id, false);
        displaySavedEntries();
        showNotification('Data berhasil dikirim ke server.', 'success');
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

function updateFailedEntry(entry) {
const transaction = db.transaction([storeName], 'readwrite');
const objectStore = transaction.objectStore(storeName);
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

function updateFailedEntry(entry) {
const transaction = db.transaction([storeName], 'readwrite');
const objectStore = transaction.objectStore(storeName);
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

// Submit all saved entries to the server
function handleSubmitAll() {
if (!navigator.onLine) {
showNotification('Anda sedang offline. Tidak dapat mengirim data.', 'error');
return;
}

// Show the spinner and disable the Kirim Semua button
kirimSemuaButton.disabled = true;
kirimSemuaSpinner.style.display = 'inline-block';

const transaction = db.transaction([storeName], 'readonly');
const objectStore = transaction.objectStore(storeName);
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

// Function to submit entries
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
formData.append('foto', entry.foto);

// Append other fields
Object.entries(entry).forEach(function([key, value]) {
    if (key !== 'foto' && key !== 'errorMessage' && key !== 'id' && !key.startsWith('nama_')) {
        formData.append(key, value);
    }
});

const xhr = new XMLHttpRequest();
xhr.open('POST', '/upload', true);

xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
        // Remove the entry from IndexedDB without showing notification
        deleteEntry(entry.id, false);
        index++;
        submitNextEntry();
    } else {
        console.error(`Error submitting entry ${entry.id}:`, xhr.statusText);
        entry.errorMessage = xhr.statusText;
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const updateRequest = objectStore.put(entry);

        updateRequest.onsuccess = function(event) {
            failedEntries.push(entry);
            index++;
            submitNextEntry();
        };

        updateRequest.onerror = function(event) {
            console.error('Error updating entry:', event.target.errorCode);
            failedEntries.push(entry);
            index++;
            submitNextEntry();
        };
    }
};

xhr.onerror = function () {
    console.error('Network error occurred during submission.');
    entry.errorMessage = 'Network error';
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    const updateRequest = objectStore.put(entry);

    updateRequest.onsuccess = function(event) {
        failedEntries.push(entry);
        index++;
        submitNextEntry();
    };

    updateRequest.onerror = function(event) {
        console.error('Error updating entry:', event.target.errorCode);
        failedEntries.push(entry);
        index++;
        submitNextEntry();
    };
};

xhr.send(formData);
}

submitNextEntry();
}

// Add both click and touchstart event listeners to "Kirim Semua" button
kirimSemuaButton.addEventListener('click', handleSubmitAll);
kirimSemuaButton.addEventListener('touchstart', handleSubmitAll);


// Function to submit entries
function submitEntries(entries) {
let index = 0;
const failedEntries = [];

function submitNextEntry() {
if (index >= entries.length) {
    kirimSemuaButton.disabled = false;
    kirimSemuaSpinner.style.display = 'none';
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
formData.append('foto', entry.foto);

// Append other fields
Object.entries(entry).forEach(([key, value]) => {
    if (!['foto', 'errorMessage', 'id'].includes(key) && !key.startsWith('nama_')) {
        formData.append(key, value);
    }
});

const xhr = new XMLHttpRequest();
xhr.open('POST', '/upload', true);

xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
        console.log('Successfully submitted entry id:', entry.id); // Debugging line
        // Remove the entry from IndexedDB without showing notification
        deleteEntry(entry.id, false);
        index++;
        submitNextEntry();
    } else {
        // Handle errors
        entry.errorMessage = xhr.statusText;
        saveFailedEntry(entry, failedEntries, index, submitNextEntry);
    }
};

xhr.onerror = function () {
    console.error('Network error during submission.');
    entry.errorMessage = 'Network error';
    saveFailedEntry(entry, failedEntries, index, submitNextEntry);
};

xhr.send(formData);
}

submitNextEntry();
}

function saveFailedEntry(entry, failedEntries, index, callback) {
const transaction = db.transaction([storeName], 'readwrite');
const objectStore = transaction.objectStore(storeName);
const updateRequest = objectStore.put(entry);

updateRequest.onsuccess = function () {
failedEntries.push(entry);
index++;
callback();
};

updateRequest.onerror = function (event) {
console.error('Error updating entry:', event.target.errorCode);
failedEntries.push(entry);
index++;
callback();
};
}

// Filter options by selected lantai
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

// Function to reset select options to original state
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

// Handle online/offline status
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
    if (!navigator.onLine) {
        statusIndicator.style.display = 'block';
    } else {
        statusIndicator.style.display = 'none';
    }
}

// Initial check
updateOnlineStatus();