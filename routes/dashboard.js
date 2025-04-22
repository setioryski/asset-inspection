const express = require('express');
const ExcelJS = require('exceljs');
const path = require('path');
const { queryAsync } = require('../config/db');
const authMiddleware = require('../authMiddleware');
const router = express.Router();
const { isAuthenticated, checkRole } = require('../authMiddleware');
const ejs = require('ejs');
const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable'); // Import the autoTable plugin
const fetch = require('node-fetch');

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
    let { startDate, endDate, kondisi, posisi, user, floor, page = 1, limit = 50 } = req.query;

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
   // use the exact startDate and endDate the user selected
   conditions.push(`a.client_timestamp BETWEEN ? AND ?`);
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

    // **New Filters: User and Floor**
    if (user) {
        conditions.push(`u.name = ?`);
        params.push(user);
    }

    if (floor) {
        conditions.push(`tl.nama_lantai = ?`);
        params.push(floor);
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
        // Sort by client_timestamp (newest first)
        query += ` ORDER BY a.client_timestamp DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

    try {
        const [results, countResult, kondisiResults, posisiResults, userResults, floorResults] = await Promise.all([
            queryAsync(query, params),
            queryAsync(countQuery, params.slice(0, params.length - 2)), // Exclude LIMIT and OFFSET
            queryAsync('SELECT DISTINCT nama_kondisi FROM tipe_kondisi'),
            queryAsync('SELECT DISTINCT tipe_posisi FROM posisi'),
            queryAsync('SELECT DISTINCT name FROM user'), // **Fetch distinct users**
            // **Fetch distinct floors based on selected 'posisi'**
            posisi
                ? queryAsync('SELECT DISTINCT tl.nama_lantai FROM tipe_lantai tl LEFT JOIN posisi p ON tl.posisi = p.id WHERE p.tipe_posisi = ?', [posisi])
                : queryAsync('SELECT DISTINCT nama_lantai FROM tipe_lantai')
        ]);

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        res.render('dashboard', { 

            startDate: req.query.startDate,
            endDate: req.query.endDate,
            kondisi: req.query.kondisi,
            user: req.query.user,
            posisi: req.query.posisi,
            floor: req.query.floor,
            limit: req.query.limit,
            page: req.query.page,
            assets: results, 
            kondisiOptions: kondisiResults, 
            posisiOptions: posisiResults,
            userOptions: userResults, // **Pass user options to template**
            floorOptions: floorResults, // **Pass floor options to template**
            startDate, 
            endDate, 
            kondisi, 
            posisi,
            user, // **Pass selected user filter to template**
            floor, // **Pass selected floor filter to template**
            currentPage: page,
            totalPages,
            limit,
            BASE_URL // Pass BASE_URL to the template
        });        
    } catch (err) {
        console.error('Failed to retrieve assets:', err);
        res.status(500).send('Error fetching assets from database');
    }
});


// Export to PDF
router.get('/export/pdf', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { startDate, endDate, kondisi, posisi, user, floor } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).send('Start date and end date are required.');
    }

    try {
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
   // use the exact startDate and endDate the user selected
   conditions.push(`a.client_timestamp BETWEEN ? AND ?`);
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

        // **New Filters: User and Floor**
        if (user) {
            conditions.push(`u.name = ?`);
            params.push(user);
        }

        if (floor) {
            conditions.push(`tl.nama_lantai = ?`);
            params.push(floor);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }

        query += ` ORDER BY a.id ASC`;

        const results = await queryAsync(query, params);

        // Pre-fetch images
        const imageCache = {};
        for (const asset of results) {
            if (asset.foto) {
                try {
                    const imageUrl = new URL(asset.foto, BASE_URL).href;
                    const imageBuffer = await fetch(imageUrl).then(res => res.buffer());
                    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
                    imageCache[asset.id] = base64Image;
                } catch (err) {
                    console.error('Error fetching image for asset', asset.id, err);
                }
            }
        }

        // Initialize jsPDF document
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // Table header
        const tableHeaders = ['No.', 'Tanggal/Waktu', 'User', 'Jenis Aset', 'Lantai', 'Kondisi', 'Foto', 'Catatan'];

        // Prepare table rows
        const tableRows = [];
        results.forEach((asset, index) => {
            const rowNumber = index + 1;
            const date = new Date(asset.client_timestamp).toLocaleDateString('id-ID');
            const time = new Date(asset.client_timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateTime = `${date} ${time}`;
            const user = asset.user || '-';
            const jenisAset = asset.nama_tipe_aset || '-';
            const lantai = asset.nama_lantai || '-';
            const kondisi = asset.nama_kondisi || '-';

            // Use splitTextToSize for "Catatan"
            const catatanText = asset.catatan || '-';
            const catatanLines = doc.splitTextToSize(catatanText, 60); // 60mm for "Catatan" column width
            const fotoPlaceholder = asset.foto ? 'Foto' : '-'; // Placeholder for the "Foto" column

            // Create table rows dynamically
            catatanLines.forEach((line, lineIndex) => {
                if (lineIndex === 0) {
                    // First line of "Catatan" goes into the main row
                    tableRows.push([
                        rowNumber.toString(),
                        dateTime,
                        user,
                        jenisAset,
                        lantai,
                        kondisi,
                        fotoPlaceholder,
                        line,
                    ]);
                } else {
                    // Overflow lines create new rows (indent others with empty cells)
                    tableRows.push(['', '', '', '', '', '', '', line]);
                }
            });
        });

        // Generate table with autoTable
        doc.autoTable({
            head: [tableHeaders],
            body: tableRows,
            startY: 20,
            styles: {
                fontSize: 9,
                cellPadding: 3,
                overflow: 'linebreak',
                valign: 'middle',
            },
            columnStyles: {
                0: { cellWidth: 10 }, // No.
                1: { cellWidth: 30 }, // Tanggal/Waktu
                2: { cellWidth: 25 }, // User
                3: { cellWidth: 30 }, // Jenis Aset
                4: { cellWidth: 15 }, // Lantai
                5: { cellWidth: 20 }, // Kondisi
                6: { cellWidth: 20 }, // Foto (placeholder, actual images require advanced handling)
                7: { cellWidth: 60 }, // Catatan
            },
            didDrawCell: (data) => {
                // Check if this is the "Foto" column
                if (data.column.index === 6 && data.row.index > -1) {
                    const asset = results[data.row.index];
                    const image = imageCache[asset.id]; // Retrieve the cached image

                    // Ensure the image exists and add it to the cell
                    if (image) {
                        const widthInPoints = 2.5 * 28.35;  // 2.5 cm width
                        const heightInPoints = 4 * 28.35;  // 4 cm height
                        const xOffset = data.cell.x + 1;  // Adjust position as needed
                        const yOffset = data.cell.y + 1;  // Adjust position as needed
                        
                        // Add the image to the cell
                        doc.addImage(image, 'JPEG', xOffset, yOffset, widthInPoints, heightInPoints);
                    }
                }
            },
        });

        // Export the PDF
        const pdfBuffer = doc.output('arraybuffer');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Asset_Report_${startDate}_to_${endDate}.pdf"`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) {
        console.error('Failed to generate PDF:', err);
        res.status(500).send('Error generating PDF');
    }
});

// Export to Excel
// --- at top of routes/dashboard.js ---
// Helper: parse a bare "YYYY-MM-DD HH:mm:ss" as UTC so you keep the original local time
function parseAsUTC(dtString) {
    return new Date(dtString.replace(' ', 'T') + 'Z');
  }
  
  router.get('/export/excel', isAuthenticated, checkRole(['admin']), async (req, res) => {
    try {
      // 1) Grab and name your raw query params
      const { startDate: sd, endDate: ed, kondisi, posisi, user, floor } = req.query;
  
      // 2) Build WHERE conditions + parameter array
      const conditions = [];
      const params     = [];
  
      if (sd) {
        conditions.push(`a.client_timestamp >= ?`);
        params.push(sd);
      }
      if (ed) {
        conditions.push(`a.client_timestamp <= ?`);
        params.push(ed);
      }
      if (kondisi) {
        conditions.push(`k.nama_kondisi = ?`);
        params.push(kondisi);
      }
      if (posisi) {
        conditions.push(`p.tipe_posisi = ?`);
        params.push(posisi);
      }
      if (user) {
        conditions.push(`u.name = ?`);
        params.push(user);
      }
      if (floor) {
        conditions.push(`tl.nama_lantai = ?`);
        params.push(floor);
      }
  
      // 3) The full SELECT + JOIN list—no placeholders!
      let sql = `
        SELECT
          a.id,
          a.foto,
          k.nama_kondisi,
          a.catatan,
          a.client_timestamp,
          u.name          AS user,
          ta.nama_tipe    AS nama_tipe_aset,
          tl.nama_lantai  AS nama_lantai,
          td.nama_tipe    AS nama_tipe_door,
          th.nama_tipe    AS nama_tipe_hb
        FROM aset a
        LEFT JOIN user u          ON a.id_user         = u.id
        LEFT JOIN tipe_aset ta    ON a.id_tipe_aset    = ta.id
        LEFT JOIN tipe_lantai tl  ON a.id_tipe_lantai  = tl.id
        LEFT JOIN tipe_kondisi k  ON a.id_kondisi      = k.id
        LEFT JOIN tipe_door td    ON a.id_tipe_door    = td.id
        LEFT JOIN tipe_hb th      ON a.id_tipe_hb      = th.id
        LEFT JOIN posisi p        ON tl.posisi         = p.id
        ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
        ORDER BY a.client_timestamp DESC
      `;
  
      // DEBUG: verify your final SQL & params in the console
      console.log('[/export/excel] SQL:', sql);
      console.log('[/export/excel] Params:', params);
  
      // 4) Fetch the rows
      const rows = await queryAsync(sql, params);
  
      // 5) Build the Excel workbook
      const workbook  = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Assets Report');
  
      worksheet.columns = [
        { header: 'No.',           key: 'no',        width: 6 },
        {
          header: 'Date Created',
          key:    'date',
          width:  20,
          style:  { numFmt: 'dd/mm/yyyy hh:mm:ss' }
        },
        { header: 'User',          key: 'user',      width: 20 },
        { header: 'Asset Type',    key: 'assetType', width: 20 },
        { header: 'Floor',         key: 'floor',     width: 10 },
        { header: 'Condition',     key: 'condition', width: 15 },
        { header: 'Photo',         key: 'photo',     width: 30 },
        { header: 'Notes',         key: 'notes',     width: 40 }
      ];
  
      // Style header
      worksheet.getRow(1).eachCell(cell => {
        cell.font      = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = {
          top:    { style: 'thin' },
          left:   { style: 'thin' },
          bottom: { style: 'thin' },
          right:  { style: 'thin' }
        };
      });
  
      // 6) Populate rows
      let counter = 1;
      const fetchNode = (...args) => import('node-fetch').then(m => m.default(...args));
      for (const asset of rows) {
        // parse client_timestamp as UTC so 15:03:57 stays 15:03:57
        const raw       = asset.client_timestamp;
        const excelDate = typeof raw === 'string'
          ? parseAsUTC(raw)
          : raw instanceof Date
            ? raw
            : new Date(raw);
  
        const newRow = worksheet.addRow({
          no:        counter++,
          date:      excelDate,
          user:      asset.user || '-',
          assetType: asset.nama_tipe_door || asset.nama_tipe_hb || asset.nama_tipe_aset || '-',
          floor:     asset.nama_lantai || '-',
          condition: asset.nama_kondisi || '-',
          notes:     asset.catatan || '-'
        });
  
        newRow.eachCell(cell => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border    = {
            top:    { style: 'thin' },
            left:   { style: 'thin' },
            bottom: { style: 'thin' },
            right:  { style: 'thin' }
          };
        });
  
        // Embed photo if present
        if (asset.foto) {
          try {
            const url    = new URL(asset.foto, BASE_URL).href;
            const buf    = await fetchNode(url).then(r => r.buffer());
            const imgId  = workbook.addImage({ buffer: buf, extension: 'jpeg' });
            worksheet.addImage(imgId, {
              tl:  { col: 6, row: newRow.number - 1 },
              ext: { width: 100, height: 75 }
            });
            newRow.height = 75;
          } catch (e) {
            console.error('Image embed error for asset', asset.id, e);
          }
        }
      }
  
      // 7) Send it down
      const filename = [
        'assets_report',
        sd && `_from_${sd.replace(/[: ]/g, '-')}`,
        ed && `_to_${ed.replace(/[: ]/g, '-')}`
      ].filter(Boolean).join('') + '.xlsx';
  
      res.setHeader('Content-Type',  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await workbook.xlsx.write(res);
      res.end();
  
    } catch (err) {
      console.error('[/export/excel] ERROR', err);
      res.status(500).send('Error generating Excel');
    }
  });
  
  


// Route to fetch floors based on posisi
router.get('/getFloors', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { posisi } = req.query;
    try {
        let query = `
            SELECT DISTINCT tl.nama_lantai 
            FROM tipe_lantai tl 
            LEFT JOIN posisi p ON tl.posisi = p.id`;
        const params = [];
        if (posisi) {
            query += ' WHERE p.tipe_posisi = ?';
            params.push(posisi);
        }
        const floors = await queryAsync(query, params);
        res.json(floors);
    } catch (err) {
        console.error('Failed to retrieve floors:', err);
        res.status(500).json({ error: 'Error fetching floors' });
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
