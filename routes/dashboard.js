const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const puppeteer = require('puppeteer');
const pool = require('../config/db'); // Adjust the path to correctly require the db module
const authMiddleware = require('../authMiddleware');
const router = express.Router();
const { isAuthenticated, checkRole } = require('../authMiddleware');

// Base URL for constructing absolute URLs
const BASE_URL = 'http://localhost:3000/'; // Adjust this to match your server's base URL

router.get('/dashboard', isAuthenticated, checkRole(['admin']), (req, res) => {
    let query = `
        SELECT 
            a.id, 
            a.foto, 
            k.nama_kondisi, 
            a.catatan, 
            a.tanggal_dibuat, 
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
    const { startDate, endDate, kondisi } = req.query;
    const conditions = [];

    if (startDate && endDate) {
        conditions.push(`a.tanggal_dibuat BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`);
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

    pool.query(query, params, (err, results) => {
        if (err) {
            console.error('Failed to retrieve assets:', err);
            res.status(500).send('Error fetching assets from database');
        } else {
            pool.query('SELECT DISTINCT nama_kondisi FROM tipe_kondisi', (err, kondisiResults) => {
                if (err) {
                    console.error('Failed to retrieve kondisi options:', err);
                    res.status(500).send('Error fetching kondisi options from database');
                } else {
                    res.render('dashboard', { assets: results, kondisiOptions: kondisiResults, startDate, endDate, kondisi });
                }
            });
        }
    });
});

router.get('/export/pdf', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { startDate, endDate, kondisi } = req.query;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the dashboard with the current query parameters
    const url = `${BASE_URL}dashboard?startDate=${startDate}&endDate=${endDate}&kondisi=${kondisi}`;
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Generate the PDF
    const pdf = await page.pdf({
        format: 'A4',
        printBackground: true
    });

    await browser.close();

    let filename = `assets_report`;
    if (startDate && endDate) {
        filename += `_from_${startDate}_to_${endDate}`;
    }
    if (kondisi) {
        filename += `_condition_${kondisi}`;
    }
    filename += `.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
});

router.get('/export/excel', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    const { startDate, endDate, kondisi } = req.query;
    let query = `
        SELECT 
            a.id, 
            a.foto, 
            k.nama_kondisi, 
            a.catatan, 
            a.tanggal_dibuat, 
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
        conditions.push(`a.tanggal_dibuat BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`);
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

    pool.query(query, params, async (err, results) => {
        if (err) {
            console.error('Failed to retrieve assets:', err);
            res.status(500).send('Error fetching assets from database');
        } else {
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

            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell, colNumber) => {
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
                    date: new Date(asset.tanggal_dibuat).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
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

                    newRow.height = 75; // Adjust row height to match image size
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
        }
    });

    async function getImageData(url) {
        const response = await fetch(url);
        const buffer = await response.buffer();
        return buffer.toString('base64');
    }
});

module.exports = router;
