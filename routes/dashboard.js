const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const puppeteer = require('puppeteer');
const { queryAsync } = require('../config/db');
const authMiddleware = require('../authMiddleware');
const router = express.Router();
const { isAuthenticated, checkRole } = require('../authMiddleware');
const ejs = require('ejs');

// Base URL for constructing absolute URLs
const BASE_URL = 'http://localhost:3000/'; // Adjust this to match your server's base URL

// Dashboard route
router.get('/dashboard', isAuthenticated, checkRole(['admin']), async (req, res) => {
    let query = `
        SELECT 
            a.id, 
            a.foto, 
            k.nama_kondisi, 
            a.catatan, 
            a.client_timestamp, 
            u.name AS user, 
            ta.nama_tipe AS nama_tipe_aset, 
            tl.nama_lantai AS nama_lantai,
            td.nama_tipe AS nama_tipe_door,
            th.nama_tipe AS nama_tipe_hb,
            p.tipe_posisi AS posisi
        FROM aset a
        LEFT JOIN user u ON a.id_user = u.id
        LEFT JOIN tipe_aset ta ON a.id_tipe_aset = ta.id
        LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
        LEFT JOIN tipe_kondisi k ON a.id_kondisi = k.id
        LEFT JOIN tipe_door td ON a.id_tipe_door = td.id
        LEFT JOIN tipe_hb th ON a.id_tipe_hb = th.id
        LEFT JOIN posisi p ON tl.posisi = p.id`;

    const params = [];
    let { startDate, endDate, kondisi, posisi, page = 1, limit = 50 } = req.query;

    // Parse and validate 'page' and 'limit'
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    
    // Define allowed limits to prevent excessive data fetching
    const allowedLimits = [50, 100, 500, 1000];
    if (!allowedLimits.includes(limit)) {
        limit = 50; // Default to 50 if invalid
    }

    const conditions = [];

    if (startDate && endDate) {
        conditions.push(`a.client_timestamp BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`);
        params.push(startDate, endDate);
    }

    if (kondisi) {
        conditions.push(`k.nama_kondisi = ?`);
        params.push(kondisi);
    }

    if (posisi) {
        conditions.push(`p.tipe_posisi = ?`);
        params.push(posisi);
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    // Clone the query for counting total records
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM aset a
        LEFT JOIN user u ON a.id_user = u.id
        LEFT JOIN tipe_aset ta ON a.id_tipe_aset = ta.id
        LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
        LEFT JOIN tipe_kondisi k ON a.id_kondisi = k.id
        LEFT JOIN tipe_door td ON a.id_tipe_door = td.id
        LEFT JOIN tipe_hb th ON a.id_tipe_hb = th.id
        LEFT JOIN posisi p ON tl.posisi = p.id` + 
        (conditions.length > 0 ? ` WHERE ` + conditions.join(' AND ') : '');

    const offset = (page - 1) * limit;
    query += ` ORDER BY a.id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
        const [results, countResult, kondisiResults, posisiResults] = await Promise.all([
            queryAsync(query, params),
            queryAsync(countQuery, params.slice(0, params.length - 2)), // Exclude LIMIT and OFFSET
            queryAsync('SELECT DISTINCT nama_kondisi FROM tipe_kondisi'),
            queryAsync('SELECT DISTINCT tipe_posisi FROM posisi')
        ]);

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        res.render('dashboard', { 
            assets: results, 
            kondisiOptions: kondisiResults, 
            posisiOptions: posisiResults, 
            startDate, 
            endDate, 
            kondisi, 
            posisi,
            currentPage: page,
            totalPages,
            limit
        });        
    } catch (err) {
        console.error('Failed to retrieve assets:', err);
        res.status(500).send('Error fetching assets from database');
    }
});

// Export to PDF route
router.get('/export/pdf', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { startDate, endDate, kondisi, posisi, limit } = req.query;

    // Validate date inputs
    if (!startDate || !endDate) {
        return res.status(400).send('Start date and end date are required.');
    }

    try {
        // Build the database query with filters
        let query = `
            SELECT 
                a.id, 
                a.foto, 
                k.nama_kondisi, 
                a.catatan, 
                a.client_timestamp, 
                u.name AS user, 
                ta.nama_tipe AS nama_tipe_aset, 
                tl.nama_lantai AS nama_lantai,
                td.nama_tipe AS nama_tipe_door,
                th.nama_tipe AS nama_tipe_hb,
                p.tipe_posisi AS posisi
            FROM aset a
            LEFT JOIN user u ON a.id_user = u.id
            LEFT JOIN tipe_aset ta ON a.id_tipe_aset = ta.id
            LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
            LEFT JOIN tipe_kondisi k ON a.id_kondisi = k.id
            LEFT JOIN tipe_door td ON a.id_tipe_door = td.id
            LEFT JOIN tipe_hb th ON a.id_tipe_hb = th.id
            LEFT JOIN posisi p ON tl.posisi = p.id`;

        const params = [];
        const conditions = [];

        if (startDate && endDate) {
            conditions.push(`a.client_timestamp BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`);
            params.push(startDate, endDate);
        }

        if (kondisi) {
            conditions.push(`k.nama_kondisi = ?`);
            params.push(kondisi);
        }

        if (posisi) {
            conditions.push(`p.tipe_posisi = ?`);
            params.push(posisi);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }

        query += ` ORDER BY a.id ASC`;

        const results = await queryAsync(query, params);

        // Modify the results to include absolute URLs for images
        const assets = results.map(asset => ({
            ...asset,
            fotoAbsoluteUrl: asset.foto ? (asset.foto.startsWith('http') ? asset.foto : `${BASE_URL}${asset.foto}`) : null
        }));

        // Render the PDF EJS template to HTML
        const templatePath = path.join(__dirname, '..', 'views', 'dashboard_pdf.ejs');
        const html = await ejs.renderFile(templatePath, { assets });

        // Launch Puppeteer browser
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Set the HTML content
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Wait for all images to load
        await page.evaluate(async () => {
            const images = Array.from(document.images);
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = img.onerror = resolve;
                });
            }));
        });

        // Generate PDF without headers and footers
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: false,
            margin: {
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px'
            }
        });

        await browser.close();

        // Format the dates for the filename
        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);
        const filename = `Monitoring_SEC_${formattedStartDate}_to_${formattedEndDate}.pdf`;

        // Set response headers for PDF download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Failed to export PDF:', err);
        res.status(500).send('Error generating PDF');
    }
});


// Export to Excel
router.get('/export/excel', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    const { startDate, endDate, kondisi } = req.query;
    let query = `
        SELECT 
            a.id, 
            a.foto, 
            k.nama_kondisi, 
            a.catatan, 
            a.client_timestamp, 
            u.name AS user, 
            ta.nama_tipe AS nama_tipe_aset, 
            tl.nama_lantai AS nama_lantai,
            td.nama_tipe AS nama_tipe_door,
            th.nama_tipe AS nama_tipe_hb
        FROM aset a
        LEFT JOIN user u ON a.id_user = u.id
        LEFT JOIN tipe_aset ta ON a.id_tipe_aset = ta.id
        LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
        LEFT JOIN tipe_kondisi k ON a.id_kondisi = k.id
        LEFT JOIN tipe_door td ON a.id_tipe_door = td.id
        LEFT JOIN tipe_hb th ON a.id_tipe_hb = th.id`;

    const params = [];
    const conditions = [];

    if (startDate && endDate) {
        conditions.push(`a.client_timestamp BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`);
        params.push(startDate, endDate);
    }

    if (kondisi) {
        conditions.push(`k.nama_kondisi = ?`);
        params.push(kondisi);
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY a.id ASC`;

    try {
        const results = await queryAsync(query, params);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Assets Report');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Date Created', key: 'date', width: 20 },
            { header: 'User', key: 'user', width: 20 },
            { header: 'Asset Type', key: 'assetType', width: 20 },
            { header: 'Floor', key: 'floor', width: 10 },
            { header: 'Condition', key: 'condition', width: 15 },
            { header: 'Photo', key: 'photo', width: 30 },
            { header: 'Notes', key: 'notes', width: 30 },
        ];

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        for (const asset of results) {
            const row = {
                id: asset.id,
                date: new Date(asset.client_timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
                user: asset.user,
                assetType: asset.nama_tipe_door || asset.nama_tipe_hb || asset.nama_tipe_aset,
                floor: asset.nama_lantai,
                condition: asset.nama_kondisi,
                notes: asset.catatan
            };

            const newRow = worksheet.addRow(row);

            newRow.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            if (asset.foto) {
                const imageUrl = new URL(asset.foto, BASE_URL);
                const imageBuffer = await fetch(imageUrl.href).then(res => res.buffer());

                const imageId = workbook.addImage({
                    buffer: imageBuffer,
                    extension: 'jpeg',
                });

                worksheet.addImage(imageId, {
                    tl: { col: 6, row: newRow.number - 1 },
                    ext: { width: 100, height: 100 }
                });

                newRow.height = 75; 
            }
        }

        let filename = `assets_report`;
        if (startDate && endDate) {
            filename += `_from_${startDate}_to_${endDate}`;
        }
        if (kondisi) {
            filename += `_condition_${kondisi}`;
        }
        filename += `.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Failed to export to Excel:', err);
        res.status(500).send('Error generating Excel report');
    }
});

module.exports = router;

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = (`0${date.getDate()}`).slice(-2); // Ensures two-digit day
    const month = (`0${date.getMonth() + 1}`).slice(-2); // Ensures two-digit month
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
