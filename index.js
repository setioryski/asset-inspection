const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;
const util = require('util');
const https = require('https');
const rateLimit = require('express-rate-limit');
const dashboardRoutes = require('./routes/dashboard');
const { queryAsync } = require('./config/db'); // Updated to use queryAsync
const { isAuthenticated, checkRole } = require('./authMiddleware'); // Authentication and role-check middleware

// Reading the SSL certificate files
// const privateKey = fs.readFileSync('/home/web1/public_html/server.key', 'utf8');
// const certificate = fs.readFileSync('/home/web1/public_html/server.cert', 'utf8');
// const credentials = { key: privateKey, cert: certificate };

// Creating HTTPS server
// const httpsServer = https.createServer(credentials, app);

//login limiter
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 requests per windowMs
    message: "Too many login attempts from this IP, please try again after 1 minute"
});
// MySQL connection pool setup

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1])
    }
});
const upload = multer({ dest: 'uploads/' });

// Set up views directory and view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware for serving static files and handling form data
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 4000000 } // Should be set to true in a production environment using HTTPS
}));




app.get('/user', isAuthenticated, async (req, res) => {
    try {
        const results = await queryAsync('SELECT id, name FROM user');
        res.json(results);
    } catch (err) {
        console.error('Failed to retrieve user:', err);
        res.status(500).send('Error retrieving user data');
    }
});

app.get('/back', (req, res) => {
    res.render('back');  // This will render the login.ejs file
});

// Redirect root login to inspection, not login to login
app.get('/', (req, res) => {
    if (req.session.isAuthenticated) {
        res.redirect('/inspection');
    } else {
        res.redirect('/login');
    }
});

//use dashboard routes
app.use('/', dashboardRoutes);


// Login route
app.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT u.*, r.role_name FROM user u INNER JOIN role r ON u.role_id = r.role_id WHERE u.name = ?';
    
    try {
        const results = await queryAsync(query, [username]);
        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = { id: user.id, name: user.name, role: user.role_name };
                req.session.isAuthenticated = true;
                res.redirect('/inspection');
            } else {
                res.send('Invalid credentials');
            }
        } else {
            res.send('User not found');
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Internal Server Error');
    }
});


// Route to handle user logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Failed to destroy session:', err);
            return res.status(500).send('Could not log out, internal server error');
        }
        res.clearCookie('connect.sid');  // Clear the session cookie
        res.redirect('/login');
    });
});





app.post('/upload', isAuthenticated, checkRole(['admin', 'petugas']), upload.single('foto'), async (req, res) => {
    const { catatan, id_user, id_tipe_aset, id_tipe_lantai, id_kondisi, id_tipe_hb, id_tipe_door } = req.body;

    if (!req.file || !id_kondisi || !id_user || !id_tipe_lantai || (!id_tipe_aset && !id_tipe_hb && !id_tipe_door)) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const resizedImagePath = `uploads/resized-${req.file.filename}`;

    try {
        await sharp(req.file.path)
            .rotate()
            .resize(800)
            .jpeg({ quality: 70 })
            .toFile(resizedImagePath);

        const query = `
            INSERT INTO aset (
                foto, id_kondisi, catatan, id_user, id_tipe_aset, id_tipe_lantai, id_tipe_hb, id_tipe_door
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const queryValues = [
            resizedImagePath, id_kondisi, catatan, id_user, id_tipe_aset, id_tipe_lantai, id_tipe_hb, id_tipe_door
        ];

        await queryAsync(query, queryValues);

        deleteFileWithRetry(req.file.path); 
        res.status(200).json({ success: true, message: 'Form submitted successfully!' });

    } catch (error) {
        console.error('Error during processing:', error);
        deleteFileWithRetry(req.file.path); 
        return res.status(500).json({ success: false, message: error.message });
    }
});



// Function to delete a file with retries on EPERM errors

// File upload endpoint


app.get('/user', isAuthenticated, (req, res) => {
    queryAsync('SELECT id, name FROM user', (err, results) => {
        if (err) {
            console.error('Failed to retrieve user:', err);
            res.status(500).send('Error retrieving user data');
        } else {
            res.json(results);
        }
    });
});

app.get('/api/floor_types', isAuthenticated, async (req, res) => {
    try {
        const results = await queryAsync('SELECT id, nama_lantai FROM tipe_lantai');
        res.json(results);
    } catch (err) {
        console.error('Failed to retrieve floor types:', err);
        res.status(500).send('Error retrieving floor types');
    }
});


app.get('/api/tipe_kondisi', isAuthenticated, async (req, res) => {
    try {
        const results = await queryAsync('SELECT id, nama_kondisi FROM tipe_kondisi');
        res.json(results);
    } catch (err) {
        console.error('Failed to retrieve conditions:', err);
        res.status(500).send('Error retrieving conditions');
    }
});


app.get('/admin', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        let tipeAsetResults = await queryAsync('SELECT id, nama_tipe FROM tipe_aset');
        let tipeLantaiResults = await queryAsync('SELECT id, nama_lantai FROM tipe_lantai');
        let userResults = await queryAsync('SELECT id, name FROM user');
        let tipeHbResults = await queryAsync('SELECT id, nama_tipe FROM tipe_hb');
        let tipeDoorResults = await queryAsync('SELECT id, nama_tipe FROM tipe_door');
        const userRole = req.session.user.role;

        res.render('admin', {
            tipe_aset: tipeAsetResults,
            tipe_lantai: tipeLantaiResults,
            user: userResults,
            tipe_hb: tipeHbResults,
            tipe_door: tipeDoorResults,
            role: userRole
        });
    } catch (err) {
        console.error('Failed to retrieve data:', err);
        res.status(500).send('Error retrieving data');
    }
});


// Route to display the login form
app.get('/login', (req, res) => {
    res.render('login');
});

// Route to handle login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userQuery = 'SELECT u.*, r.role_name FROM user u INNER JOIN role r ON u.role_id = r.role_id WHERE u.name = ?';

    try {
        // Use pool.query to execute the SQL query with the username parameter
        const [results] = await queryAsync(userQuery, [username]);
        if (results.length > 0) {
            const user = results[0];
            // Compare the hashed password
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                // Set user information in session
                req.session.user = { id: user.id, name: user.name, role: user.role_name };
                req.session.isAuthenticated = true;
                res.redirect('/dashboard');
            } else {
                res.send('Invalid credentials');
            }
        } else {
            res.send('User not found');
        }
    } catch (err) {
        console.error('Error during login process:', err);
        res.status(500).send('Internal Server Error: ' + err.message);
    }
});


app.get('/inspection', isAuthenticated, checkRole(['admin', 'petugas']), async (req, res) => {
    try {
        // Assuming req.session.user contains the logged-in user's info
        const currentUser = {
            id: req.session.user.id,   // ID of the logged-in user
            name: req.session.user.name // Name of the logged-in user
        };
        const assetTypes = await getAssetTypes();
        const floorTypes = await getFloorTypes();
        const conditions = await getConditions();
        const hbTypes = await getHbTypes(); // Fetch the HB types data
        const doorTypes = await getDoorTypes(); // Fetch the door types data

        res.render('InspectionForm', {
            user: currentUser, // Pass only the logged-in user's data
            tipe_aset: assetTypes,
            tipe_lantai: floorTypes,
            tipe_kondisi: conditions,
            tipe_hb: hbTypes, // Pass the HB types data to the template
            tipe_door: doorTypes // Pass the door types data to the template
        });
    } catch (error) {
        console.error('Failed to fetch data for inspection form:', error);
        res.status(500).send('Error fetching data');
    }
});

// ADMIN FUNCTION

// Route to display form for adding new 'user'
app.get('/add-user-form', (req, res) => {
    res.render('add-user-form');
});

// Route to handle adding new 'user'
app.use(express.urlencoded({ extended: true }));

app.post('/add-user', async (req, res) => {
    try {
        const { name, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const roleIds = { admin: 1, petugas: 2 };
        const roleId = roleIds[role.toLowerCase()];

        await queryAsync('INSERT INTO user (name, password, role_id) VALUES (?, ?, ?)', [name, hashedPassword, roleId]);
        res.redirect('/admin');
    } catch (error) {
        res.status(500).send('Server error: ' + error.message);
    }
});

// Route to display edit form for 'user'
app.get('/edit-user-form/:id', (req, res) => {
    const id = req.params.id;
    const query = 'SELECT * FROM user WHERE id = ?';
    queryAsync(query, [id], (err, results) => {
        if (err) {
            console.error('Failed to retrieve user:', err);
            return res.status(500).send('Error retrieving user');
        }
        if (results.length > 0) {
            res.render('edit-user-form', { user: results[0] });
        } else {
            res.status(404).send('Petugas not found');
        }
    });
});


// Route to handle updating 'user'
app.post('/update-user', (req, res) => {
    const { id, name } = req.body;
    const sql = 'UPDATE user SET name = ? WHERE id = ?';
    queryAsync(sql, [name, id], (err, result) => {
        if (err) {
            return res.status(500).send('Error updating user');
        }
        res.redirect('/admin');
    });
});

// Route to handle deleting 'user'
app.post('/delete-user', (req, res) => {
    const { id } = req.body;
    const sql = 'DELETE FROM user WHERE id = ?';
    queryAsync(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).send('Error deleting user');
        }
        res.redirect('/admin');
    });
});

// Display form for adding new 'tipe_lantai'
app.get('/add-tipe-lantai-form', (req, res) => {
    res.render('add-tipe-lantai-form');
});

// Handle adding new 'tipe_lantai'
app.post('/add-tipe-lantai', (req, res) => {
    const { nama_lantai } = req.body;
    const sql = 'INSERT INTO tipe_lantai (nama_lantai) VALUES (?)';
    queryAsync(sql, [nama_lantai], (err, result) => {
        if (err) {
            console.error('Error adding tipe_lantai:', err);
            return res.status(500).send('Failed to add new tipe_lantai');
        }
        res.redirect('/admin');
    });
});


// Display form for editing 'tipe_lantai'
app.get('/edit-tipe-lantai-form/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM tipe_lantai WHERE id = ?';
    queryAsync(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).send('Error retrieving tipe_lantai');
        }
        res.render('edit-tipe-lantai-form', { tipe_lantai: results[0] });
    });
});

// Handle updating 'tipe_lantai'
app.post('/update-tipe-lantai', (req, res) => {
    const { id, nama_lantai } = req.body;
    const sql = 'UPDATE tipe_lantai SET nama_lantai = ? WHERE id = ?';
    queryAsync(sql, [nama_lantai, id], (err, result) => {
        if (err) {
            return res.status(500).send('Error updating tipe_lantai');
        }
        res.redirect('/admin');
    });
});

// Ensure you have an add-tipe-aset-form.ejs file in your views folder
app.get('/add-tipe-aset-form', (req, res) => {
    res.render('add-tipe-aset-form');  // Ensure you have an add-tipe-aset-form.ejs file in your views folder
});

app.post('/add-tipe-aset', (req, res) => {
    const { nama_tipe } = req.body;
    const sql = 'INSERT INTO tipe_aset (nama_tipe) VALUES (?)';
    queryAsync(sql, [nama_tipe], (err, result) => {
        if (err) {
            console.error('Error adding tipe_aset:', err);
            return res.status(500).send('Failed to add new tipe_aset');
        }
        res.redirect('/admin');
    });
});

app.get('/edit-tipe-aset-form/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM tipe_aset WHERE id = ?';
    queryAsync(sql, [id], (err, results) => {
        if (err) {
            console.error('Error retrieving tipe_aset for edit:', err);
            return res.status(500).send('Failed to retrieve tipe_aset for editing');
        }
        if (results.length > 0) {
            res.render('edit-tipe-aset-form', { tipe_aset: results[0] });  // Ensure you have an edit-tipe-aset-form.ejs file
        } else {
            res.send('Tipe Aset not found');
        }
    });
});

app.post('/update-tipe-aset', (req, res) => {
    const { id, nama_tipe } = req.body;
    const sql = 'UPDATE tipe_aset SET nama_tipe = ? WHERE id = ?';
    queryAsync(sql, [nama_tipe, id], (err, result) => {
        if (err) {
            console.error('Error updating tipe_aset:', err);
            return res.status(500).send('Failed to update tipe_aset');
        }
        res.redirect('/admin');
    });
});


app.post('/delete-tipe-aset', (req, res) => {
    const { id } = req.body;
    const sql = 'DELETE FROM tipe_aset WHERE id = ?';
    queryAsync(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting tipe_aset:', err);
            return res.status(500).send('Failed to delete tipe_aset');
        }
        res.redirect('/admin');
    });
});
app.post('/delete-tipe-lantai', (req, res) => {
    const { id } = req.body;
    const sql = 'DELETE FROM tipe_lantai WHERE id = ?';
    queryAsync(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting tipe_aset:', err);
            return res.status(500).send('Failed to delete tipe_aset');
        }
        res.redirect('/admin');
    });
});

// Route to render the edit form
// Routes for managing tipe_hb
app.get('/add-tipe-hb-form', isAuthenticated, checkRole(['admin']), (req, res) => {
    res.render('add-tipe-hb-form');
});

app.post('/admin/tipe_hb/add', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const { nama_tipe } = req.body;
        await queryAsync('INSERT INTO tipe_hb (nama_tipe) VALUES (?)', [nama_tipe]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Failed to add tipe_hb:', err);
        res.status(500).send('Error adding tipe_hb');
    }
});

app.get('/edit-tipe-hb-form/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const id = req.params.id;
        const result = await queryAsync('SELECT id, nama_tipe FROM tipe_hb WHERE id = ?', [id]);
        const tipeHb = result[0];
        res.render('edit-tipe-hb-form', { tipeHb });
    } catch (err) {
        console.error('Failed to retrieve tipe_hb for edit:', err);
        res.status(500).send('Error retrieving tipe_hb for edit');
    }
});

app.post('/admin/tipe_hb/update/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const id = req.params.id;
        const { nama_tipe } = req.body;
        await queryAsync('UPDATE tipe_hb SET nama_tipe = ? WHERE id = ?', [nama_tipe, id]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Failed to update tipe_hb:', err);
        res.status(500).send('Error updating tipe_hb');
    }
});

// Routes for managing tipe_door
app.get('/add-tipe-door-form', isAuthenticated, checkRole(['admin']), (req, res) => {
    res.render('add-tipe-door-form');
});

app.post('/admin/tipe_door/add', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const { nama_tipe } = req.body;
        await queryAsync('INSERT INTO tipe_door (nama_tipe) VALUES (?)', [nama_tipe]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Failed to add tipe_door:', err);
        res.status(500).send('Error adding tipe_door');
    }
});

app.get('/edit-tipe-door-form/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const id = req.params.id;
        const result = await queryAsync('SELECT id, nama_tipe FROM tipe_door WHERE id = ?', [id]);
        const tipeDoor = result[0];
        res.render('edit-tipe-door-form', { tipeDoor });
    } catch (err) {
        console.error('Failed to retrieve tipe_door for edit:', err);
        res.status(500).send('Error retrieving tipe_door for edit');
    }
});

app.post('/admin/tipe_door/update/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const id = req.params.id;
        const { nama_tipe } = req.body;
        await queryAsync('UPDATE tipe_door SET nama_tipe = ? WHERE id = ?', [nama_tipe, id]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Failed to update tipe_door:', err);
        res.status(500).send('Error updating tipe_door');
    }
});

app.post('/delete-tipe-hb', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const id = req.body.id;
        console.log('Deleting HB type with ID:', id);
        const result = await queryAsync('DELETE FROM tipe_hb WHERE id = ?', [id]);
        console.log('Delete result for HB type:', result);
        res.redirect('/admin');
    } catch (err) {
        console.error('Failed to delete tipe_hb:', err);
        res.status(500).send('Error deleting tipe_hb');
    }
});

app.post('/delete-tipe-door', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const id = req.body.id;
        console.log('Deleting door type with ID:', id);
        const result = await queryAsync('DELETE FROM tipe_door WHERE id = ?', [id]);
        console.log('Delete result for door type:', result);
        res.redirect('/admin');
    } catch (err) {
        console.error('Failed to delete tipe_door:', err);
        res.status(500).send('Error deleting tipe_door');
    }
});









// Example implementations of data-fetching functions
// This function now takes userId as a parameter to fetch only that user's data
async function getUserById(userId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id, name FROM user WHERE id = ?';
        queryAsync(query, [userId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                // Since you're fetching one user, you might want to return only one user object instead of an array
                resolve(results[0]); // Assuming the query will always return at most one row
            }
        });
    });
}





async function getFloorTypes() {
    return new Promise((resolve, reject) => {
        queryAsync('SELECT id, nama_lantai FROM tipe_lantai', (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

async function getConditions() {
    return new Promise((resolve, reject) => {
        queryAsync('SELECT id, nama_kondisi FROM tipe_kondisi', (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

async function getAssetTypes() {
    return new Promise((resolve, reject) => {
        queryAsync('SELECT id, nama_tipe, lantai_id FROM tipe_aset', (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

async function getHbTypes() {
    return new Promise((resolve, reject) => {
        queryAsync('SELECT id, nama_tipe, lantai_id FROM tipe_hb', (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

async function getDoorTypes() {
    return new Promise((resolve, reject) => {
        queryAsync('SELECT id, nama_tipe, lantai_id FROM tipe_door', (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}



function redirectIfLoggedIn(req, res, next) {
    if (req.session.isAuthenticated) {
        return res.redirect('/inspection');
    }
    next();
}

app.get('/login', redirectIfLoggedIn, (req, res) => {
    res.render('login');
});

function ensureAuthenticated(req, res, next) {
    if (!req.session.isAuthenticated) {
        return res.redirect('/login');
    }
    next();
}

app.get('/inspection', ensureAuthenticated, (req, res) => {
    // Assuming that the inspection form can handle logged-in users' data
    res.render('inspectionForm');
});





//delete path
function deleteFile(path) {
    fs.unlink(path, (err) => {
        if (err) {
            if (err.code === 'EPERM') {
                // Retry after a delay if it's a permission error
                setTimeout(() => deleteFile(path), 1000);
            } else {
                console.error('Failed to delete file:', err);
            }
        } else {
            console.log('File deleted successfully');
        }
    });
}

function deleteFileWithRetry(filePath, maxAttempts = 3) {
    let attempts = 0;

    const attemptDeletion = () => {
        fs.unlink(filePath, (err) => {
            if (err) {
                if (++attempts < maxAttempts) {
                    console.log(`Attempt ${attempts} failed, retrying to delete ${filePath}...`);
                    setTimeout(attemptDeletion, 1000); // retry after 1 second
                } else {
                    console.error(`Failed to delete ${filePath} after several attempts:`, err);
                }
            } else {
                console.log(`File ${filePath} deleted successfully`);
            }
        });
    };}


//https
// app.use((req, res, next) => {
//     if (req.secure) {
//         next();
//     } else {
//         res.redirect(`https://${req.headers.host}${req.url}`);
//     }
// });

// httpsServer.listen(port, () => {
//     console.log(`HTTPS server running on port ${port}`);
//   });
  
    app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
  });