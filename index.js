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
const { pool,queryAsync } = require('./config/db'); // Updated to use queryAsync
const { isAuthenticated, checkRole } = require('./authMiddleware'); // Authentication and role-check middleware
const RedisStore = require('connect-redis')(session);
const redisClient = require('./config/redis'); // Ensure the path is correct
const compression = require('compression');
const asyncLib = require('async'); // Renamed to avoid conflict with async keyword

// Trust Proxy Configuration
app.set('trust proxy', 1); // Trust the first proxy. Adjust as needed.

const imageProcessingQueue = asyncLib.queue((task, callback) => {
    sharp(task.filePath)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toFile(`processed/${path.basename(task.filePath)}`)
        .then(() => {
            // Delete the original file from 'uploads/' directory
            fs.unlink(task.filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting original file:', unlinkErr);
                    // Optionally handle the error (e.g., log it)
                }
                // Call the callback with no error to indicate success
                callback(null);
            });
        })
        .catch((error) => {
            console.error('Image processing error:', error);
            // Call the callback with the error to indicate failure
            callback(error);
        });
}, 2); // Limit to 2 concurrent image processing tasks





//login limiter
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 requests per windowMs
    message: "Too many login attempts from this IP, please try again after 1 minute"
});
// MySQL connection pool setup

//multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Rate Limiter for Uploads
const uploadLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 upload requests per windowMs
    message: "Too many uploads from this IP, please try again after a minute"
});

const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10000, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after a minute"
});
app.use(generalLimiter);

// Ensure directories exist
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath, { recursive: true });
    }
};
ensureDirectoryExists('uploads/');
ensureDirectoryExists('processed/');

// Set up views directory and view engine
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware for serving static files and handling form data
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/processed', express.static(path.join(__dirname, 'processed')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'your_session_secret_key', // Replace with your actual session secret
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,    // Set to true if using HTTPS
        httpOnly: true, 
        maxAge: 4000000 
    }
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

// Serve sw.js from the root URL
app.get('/sw.js', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public/sw.js'));
});

//use dashboard routes
app.use('/', dashboardRoutes);


// Login route
app.post('/login', loginLimiter, async (req, res) => {
    console.log(`Attempting login for user: ${req.body.username}`);
    const { username, password } = req.body;
    const query = 'SELECT u.*, r.role_name FROM user u INNER JOIN role r ON u.role_id = r.role_id WHERE u.name = ?';
    
    try {
        const results = await queryAsync(query, [username]);
        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                // Set the session with the new user's data
                req.session.user = { id: user.id, name: user.name, role: user.role_name };
                req.session.isAuthenticated = true;
                console.log(`User ${username} logged in successfully`);

                // Ensure that the session is fresh for the new user
                res.redirect('/inspection');
            } else {
                console.log(`Invalid password for user: ${username}`);
                res.send('Invalid credentials');
            }
        } else {
            console.log(`Login failed: User ${username} not found`);
            res.send('User not found');
        }
    } catch (err) {
        console.error(`Database error during login for user ${username}:`, err);
        res.status(500).send('Internal Server Error');
    }
});




// Logout route
app.get('/logout', (req, res) => {
    console.log(`User ${req.session?.user?.name || 'Unknown'} logging out`);

    // 🔴 Explicitly remove user data from session before destroying it
    if (req.session) {
        req.session.user = null; // Remove user info
    }

    res.clearCookie('sessionToken', { path: '/' }); // Ensure cookie is cleared
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out');
        }

        res.redirect('/login'); // Redirect to login page after session is cleared
    });
});







// Upload route
app.post('/upload', uploadLimiter, isAuthenticated, checkRole(['admin', 'petugas']), upload.single('foto'), async (req, res) => {
    const {
        catatan, id_user, id_tipe_aset, id_tipe_lantai,
        id_kondisi, id_tipe_hb, id_tipe_door, clientTimestamp
    } = req.body;

    // Validate required fields
    if (
        !req.file || !id_kondisi || !id_user || !id_tipe_lantai ||
        (!id_tipe_aset && !id_tipe_hb && !id_tipe_door)
    ) {
        // Delete the uploaded file if validation fails
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
        });
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Validate clientTimestamp format
    const timestamp = new Date(clientTimestamp);
    if (!clientTimestamp || isNaN(timestamp.getTime())) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
        });
        return res.status(400).json({ success: false, message: 'Invalid client timestamp.' });
    }

    const filePath = req.file.path;
    const processedPath = `processed/${path.basename(filePath)}`;

    // Push the image processing task to the queue
    imageProcessingQueue.push({ filePath }, async (err) => {
        if (err) {
            console.error('Image processing failed:', err);
            // Delete the original file if processing fails
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
            return res.status(500).json({ success: false, message: 'Image processing failed.' });
        }

        try {
            // Insert into the database using processedPath
            await queryAsync(`
                INSERT INTO aset (
                    foto, id_kondisi, catatan, id_user, id_tipe_aset,
                    id_tipe_lantai, id_tipe_hb, id_tipe_door, client_timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                processedPath, id_kondisi, catatan, id_user, id_tipe_aset,
                id_tipe_lantai, id_tipe_hb, id_tipe_door, timestamp
            ]);

            res.status(200).json({ success: true, message: 'Form submitted successfully!' });
        } catch (error) {
            console.error('Database error during upload:', error);
            // Delete the processed file if database insertion fails
            fs.unlink(processedPath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting processed file:', unlinkErr);
            });
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    });
});




// Time sync endpoint
app.get('/api/server-time', (req, res) => {
    res.json({ serverTime: Date.now() });
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
        // Prevent caching for admin page
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        let tipeAsetResults = await queryAsync(`SELECT ta.id, ta.nama_tipe, ta.lantai_id, tl.nama_lantai FROM tipe_aset ta LEFT JOIN tipe_lantai tl ON ta.lantai_id = tl.id ORDER BY ta.lantai_id ASC, ta.id ASC`);
        let tipeHbResults = await queryAsync(`SELECT th.id, th.nama_tipe, th.lantai_id, tl.nama_lantai FROM tipe_hb th LEFT JOIN tipe_lantai tl ON th.lantai_id = tl.id ORDER BY th.lantai_id ASC, th.id ASC`);
        let tipeDoorResults = await queryAsync(`SELECT td.id, td.nama_tipe, td.lantai_id, tl.nama_lantai FROM tipe_door td LEFT JOIN tipe_lantai tl ON td.lantai_id = tl.id ORDER BY td.lantai_id ASC, td.id ASC`);
        let tipeLantaiResults = await queryAsync('SELECT id, nama_lantai FROM tipe_lantai');
        let userResults = await queryAsync('SELECT id, name FROM user ORDER BY id ASC');

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
    // Make sure to clear session data before rendering the login page
    req.session.destroy(() => {
        res.render('login');
    });
});

app.get('/inspection', isAuthenticated, checkRole(['admin', 'petugas']), async (req, res) => {
    console.log(`User ${req.session.user.name} accessed inspection form`);
    
    try {
        // Ensure no caching of this page
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const currentUser = {
            id: req.session.user.id,
            name: req.session.user.name
        };
        const assetTypes = await getAssetTypes();
        const floorTypes = await getFloorTypes();
        const conditions = await getConditions();
        const hbTypes = await getHbTypes();
        const doorTypes = await getDoorTypes();

        console.log(`Data fetched successfully for inspection form by user ${currentUser.name}`);
        res.render('InspectionForm', {
            user: currentUser,  // Pass user data to the view
            tipe_aset: assetTypes,
            tipe_lantai: floorTypes,
            tipe_kondisi: conditions,
            tipe_hb: hbTypes,
            tipe_door: doorTypes
        });
    } catch (error) {
        console.error(`Failed to fetch data for inspection form for user ${req.session.user.name}:`, error);
        res.status(500).send('Error fetching data');
    }
});




// ADMIN FUNCTION

// Route to display form for adding new 'user'
// Route to render the form for adding a new user
app.get('/add-user-form', (req, res) => {
    res.render('add-user-form');
});

// Route to handle adding a new user
// CRUD operations logging
app.post('/add-user', async (req, res) => {
    console.log(`Adding new user: ${req.body.name}`);
    try {
        const { name, password, role } = req.body;

        // Check if the user already exists
        const checkQuery = 'SELECT * FROM user WHERE name = ?';
        const existingUser = await queryAsync(checkQuery, [name]);
        if (existingUser.length > 0) {
            console.log(`User ${name} already exists`);
            return res.status(400).send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const roleIds = { admin: 1, petugas: 2 };
        const roleId = roleIds[role.toLowerCase()];

        await queryAsync('INSERT INTO user (name, password, role_id) VALUES (?, ?, ?)', [name, hashedPassword, roleId]);
        console.log(`User ${name} added successfully`);
        res.redirect('/admin');
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Server error: ' + error.message);
    }
});



// Route to display the edit form for a user
// Example for another route
app.get('/edit-user-form/:id', async (req, res) => {
    const id = req.params.id;
    const query = 'SELECT * FROM user WHERE id = ?';

    try {
        const results = await queryAsync(query, [id]);
        if (results.length > 0) {
            // Set cache control headers
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            res.render('edit-user-form', { user: results[0] });
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        console.error('Error retrieving user:', err);
        res.status(500).send('Error retrieving user');
    }
});



// Route to handle updating a user
app.post('/update-user', async (req, res) => {
    console.log(`Updating user with ID: ${req.body.id}`);
    try {
        const { id, name, password, role_id } = req.body;

        // Check if the new username already exists for a different user
        const checkQuery = 'SELECT * FROM user WHERE name = ? AND id != ?';
        const existingUser = await queryAsync(checkQuery, [name, id]);
        if (existingUser.length > 0) {
            console.log(`Username ${name} is already taken by another user`);
            return res.status(400).send('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'UPDATE user SET name = ?, password = ?, role_id = ? WHERE id = ?';
        
        const result = await pool.query(sql, [name, hashedPassword, role_id, id]);
        if (result.affectedRows === 0) {
            console.log(`No update performed for user with ID: ${id}`);
            return res.status(404).send('User not found or no changes made');
        }
        console.log(`User with ID: ${id} updated successfully`);
        res.redirect('/admin');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
    }
});




// Route to handle deleting a user
app.post('/delete-user', async (req, res) => {
    console.log(`Deleting user with ID: ${req.body.id}`);
    try {
        const result = await queryAsync('DELETE FROM user WHERE id = ?', [req.body.id]);
        if (result.affectedRows === 0) {
            console.log(`User with ID: ${req.body.id} not found`);
            return res.status(404).send('User not found');
        }
        console.log(`User with ID: ${req.body.id} deleted successfully`);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).send('Error deleting user');
    }
});

// Route to render the form for adding a new 'tipe_lantai'
app.get('/add-tipe-lantai-form', async (req, res) => {
    try {
        // Fetch the list of positions from the database
        const posisiOptions = await queryAsync('SELECT id, tipe_posisi FROM posisi');
        
        // Render the form with posisi options
        res.render('add-tipe-lantai-form', { posisiOptions });
    } catch (err) {
        console.error('Error fetching posisi options:', err);
        res.status(500).send('Failed to load form');
    }
});


// Route to handle adding a new 'tipe_lantai'
app.post('/add-tipe-lantai', async (req, res) => {
    const { nama_lantai, posisi } = req.body;
    const sql = 'INSERT INTO tipe_lantai (nama_lantai, posisi) VALUES (?, ?)';

    try {
        await queryAsync(sql, [nama_lantai, posisi]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error adding tipe_lantai:', err);
        res.status(500).send('Failed to add new tipe_lantai');
    }
});

// Route to render the edit form for 'tipe_lantai'
app.get('/edit-tipe-lantai-form/:id', async (req, res) => {
    const id = req.params.id;
    const tipeLantaiSql = 'SELECT * FROM tipe_lantai WHERE id = ?';
    const posisiSql = 'SELECT id, tipe_posisi FROM posisi';

    try {
        const tipeLantaiResults = await queryAsync(tipeLantaiSql, [id]);
        const posisiOptions = await queryAsync(posisiSql);

        if (tipeLantaiResults.length > 0) {
            // Prevent caching
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            // Render the edit form with data
            res.render('edit-tipe-lantai-form', { tipeLantai: tipeLantaiResults[0], posisiOptions });
        } else {
            res.status(404).send('Floor type not found');
        }
    } catch (err) {
        console.error('Error retrieving floor type or posisi options:', err);
        res.status(500).send('Error retrieving tipe_lantai');
    }
});



// Route to handle updating 'tipe_lantai'
app.post('/update-tipe-lantai', async (req, res) => {
    const { id, nama_lantai, posisi } = req.body;
    const sql = 'UPDATE tipe_lantai SET nama_lantai = ?, posisi = ? WHERE id = ?';

    try {
        await queryAsync(sql, [nama_lantai, posisi, id]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error updating tipe_lantai:', err);
        res.status(500).send('Error updating tipe_lantai');
    }
});


// Route to handle deleting 'tipe_lantai'
app.post('/delete-tipe-lantai', async (req, res) => {
    const { id } = req.body;
    const sql = 'DELETE FROM tipe_lantai WHERE id = ?';

    try {
        await queryAsync(sql, [id]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error deleting tipe_lantai:', err);
        res.status(500).send('Failed to delete tipe_lantai');
    }
});

// Route to render the form for adding a new 'tipe_aset'
app.get('/add-tipe-aset-form', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const floorTypes = await getFloorTypes();
        res.render('add-tipe-aset-form', { floorTypes });
    } catch (err) {
        console.error('Error fetching floor types:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle adding a new 'tipe_aset'
app.post('/add-tipe-aset', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { nama_tipe, lantai_id } = req.body;
    const sql = 'INSERT INTO tipe_aset (nama_tipe, lantai_id) VALUES (?, ?)';

    try {
        await queryAsync(sql, [nama_tipe, lantai_id]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error adding tipe_aset:', err);
        res.status(500).send('Failed to add new tipe_aset');
    }
});


// Route to render the edit form for 'tipe_aset'
app.get('/edit-tipe-aset-form/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM tipe_aset WHERE id = ?';

    try {
        const results = await queryAsync(sql, [id]);
        if (results.length > 0) {
            const floorTypes = await getFloorTypes();
            
            // Set headers to prevent caching of this response
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            // Render the edit form
            res.render('edit-tipe-aset-form', { tipe_aset: results[0], floorTypes });
        } else {
            res.status(404).send('Asset type not found');
        }
    } catch (err) {
        res.status(500).send('Failed to retrieve tipe_aset for editing');
    }
});

// Route to handle updating 'tipe_aset'
app.post('/update-tipe-aset', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { id, nama_tipe, lantai_id } = req.body;
    const sql = 'UPDATE tipe_aset SET nama_tipe = ?, lantai_id = ? WHERE id = ?';

    try {
        await queryAsync(sql, [nama_tipe, lantai_id, id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Failed to update tipe_aset');
    }
});

// Route to handle deleting 'tipe_aset'
app.post('/delete-tipe-aset', async (req, res) => {
    const { id } = req.body;
    try {
        // First, delete related records from the `aset` table
        await queryAsync('DELETE FROM aset WHERE id_tipe_aset = ?', [id]);

        // Then, delete the `tipe_aset` record
        await queryAsync('DELETE FROM tipe_aset WHERE id = ?', [id]);

        res.redirect('/admin');
    } catch (err) {
        console.error('Error deleting tipe_aset:', err);
        res.status(500).send('Failed to delete tipe_aset');
    }
});


// Route to render the form for adding a new 'tipe_hb'
app.get('/add-tipe-hb-form', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const floorTypes = await getFloorTypes();
        res.render('add-tipe-hb-form', { floorTypes });
    } catch (err) {
        console.error('Error fetching floor types:', err);
        res.status(500).send('Internal Server Error');
    }
});
// Route to handle adding 'tipe_hb'
app.post('/admin/tipe_hb/add', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { nama_tipe, lantai_id } = req.body;

    try {
        await queryAsync('INSERT INTO tipe_hb (nama_tipe, lantai_id) VALUES (?, ?)', [nama_tipe, lantai_id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error adding tipe_hb');
    }
});


// Route to render the edit form for 'tipe_hb'
app.get('/edit-tipe-hb-form/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const id = req.params.id;

    try {
        const result = await queryAsync('SELECT * FROM tipe_hb WHERE id = ?', [id]);
        if (result.length > 0) {
            const floorTypes = await getFloorTypes();
            
            // Prevent caching for this route
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            res.render('edit-tipe-hb-form', { tipeHb: result[0], floorTypes });
        } else {
            res.status(404).send('HB type not found');
        }
    } catch (err) {
        res.status(500).send('Error retrieving tipe_hb for edit');
    }
});


// Route to handle updating 'tipe_hb'
app.post('/admin/tipe_hb/update/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const id = req.params.id;
    const { nama_tipe, lantai_id } = req.body;

    try {
        await queryAsync('UPDATE tipe_hb SET nama_tipe = ?, lantai_id = ? WHERE id = ?', [nama_tipe, lantai_id, id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error updating tipe_hb');
    }
});

// Route to handle deleting 'tipe_hb'
app.post('/delete-tipe-hb', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const id = req.body.id;

    try {
        await queryAsync('DELETE FROM tipe_hb WHERE id = ?', [id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error deleting tipe_hb');
    }
});


// Route to handle updating tipe_lantai
app.get('/admin/tipe_lantai/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the specific floor type (`tipe_lantai`) by ID
        const [tipeLantai] = await queryAsync(`SELECT * FROM tipe_lantai WHERE id = ?`, [id]);

        // Fetch all positions for the `posisi` dropdown
        const posisiOptions = await queryAsync(`SELECT id, tipe_posisi FROM posisi`);

        if (!tipeLantai) {
            return res.status(404).send("Floor Type not found");
        }

        // Render the edit form with floor type data and position options
        res.render('edit-tipe-lantai-form', { tipeLantai, posisiOptions });
    } catch (err) {
        console.error('Error fetching floor type:', err);
        res.status(500).send('Server error');
    }
});

app.post('/admin/tipe_lantai/update/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_lantai, posisi } = req.body;
        
        // Update the database with the new values for `nama_lantai` and `posisi`
        await queryAsync(`
            UPDATE tipe_lantai
            SET nama_lantai = ?, posisi = ?
            WHERE id = ?
        `, [nama_lantai, posisi, id]);

        // Redirect back to a list or dashboard after updating
        res.redirect('/admin');
    } catch (err) {
        console.error('Error updating floor type:', err);
        res.status(500).send('Server error');
    }
});

// Route to render the form for adding a new 'tipe_door'
app.get('/add-tipe-door-form', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
        const floorTypes = await getFloorTypes();
        res.render('add-tipe-door-form', { floorTypes });
    } catch (err) {
        console.error('Error fetching floor types:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle adding 'tipe_door'
app.post('/admin/tipe_door/add', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { nama_tipe, lantai_id } = req.body;

    try {
        await queryAsync('INSERT INTO tipe_door (nama_tipe, lantai_id) VALUES (?, ?)', [nama_tipe, lantai_id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error adding tipe_door');
    }
});


// Route to render the edit form for 'tipe_door'
app.get('/edit-tipe-door-form/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const id = req.params.id;

    try {
        const result = await queryAsync('SELECT * FROM tipe_door WHERE id = ?', [id]);
        if (result.length > 0) {
            const floorTypes = await getFloorTypes();
            
            // Prevent caching for this route
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            res.render('edit-tipe-door-form', { tipeDoor: result[0], floorTypes });
        } else {
            res.status(404).send('Door type not found');
        }
    } catch (err) {
        res.status(500).send('Error retrieving tipe_door for edit');
    }
});


// Route to handle updating 'tipe_door'
app.post('/admin/tipe_door/update/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const id = req.params.id;
    const { nama_tipe, lantai_id } = req.body;

    try {
        await queryAsync('UPDATE tipe_door SET nama_tipe = ?, lantai_id = ? WHERE id = ?', [nama_tipe, lantai_id, id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error updating tipe_door');
    }
});

// Route to handle deleting 'tipe_door'
app.post('/delete-tipe-door', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const id = req.body.id;

    try {
        await queryAsync('DELETE FROM tipe_door WHERE id = ?', [id]);
        res.redirect('/admin');
    } catch (err) {
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
    try {
        const results = await queryAsync(`
            SELECT ta.id, ta.nama_tipe, ta.lantai_id, tl.nama_lantai
            FROM tipe_aset ta
            LEFT JOIN tipe_lantai tl ON ta.lantai_id = tl.id
        `);
        return results;
    } catch (error) {
        throw new Error('Error fetching asset types: ' + error.message);
    }
}



async function getHbTypes() {
    try {
        const results = await queryAsync(`
            SELECT th.id, th.nama_tipe, th.lantai_id, tl.nama_lantai
            FROM tipe_hb th
            LEFT JOIN tipe_lantai tl ON th.lantai_id = tl.id
        `);
        return results;
    } catch (error) {
        throw new Error('Error fetching HB types: ' + error.message);
    }
}


async function getDoorTypes() {
    try {
        const results = await queryAsync(`
            SELECT td.id, td.nama_tipe, td.lantai_id, tl.nama_lantai
            FROM tipe_door td
            LEFT JOIN tipe_lantai tl ON td.lantai_id = tl.id
        `);
        return results;
    } catch (error) {
        throw new Error('Error fetching door types: ' + error.message);
    }
}



function redirectIfLoggedIn(req, res, next) {
    if (req.session.isAuthenticated) {
        return res.redirect('/inspection');
    }
    next();
}




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
    };

    attemptDeletion();
}



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