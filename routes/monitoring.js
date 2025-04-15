const express = require('express');
const router = express.Router();
const { queryAsync } = require('../config/db');
const { isAuthenticated, checkRole } = require('../authMiddleware');

router.get('/monitoring', isAuthenticated, checkRole(['admin']), async (req, res) => {
  try {
    // 1. Parsing dan default tanggal:
    let { startDate, endDate } = req.query;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format YYYY-MM-DD
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (!startDate) startDate = `${yesterdayStr} 00:00:00`;
    if (!endDate) endDate = `${todayStr} 00:00:00`;

    // 2. Query Monitoring (CTE)
    const monitoringSql = `
    WITH cte_aset AS (
        SELECT 
            CONCAT_WS(' / ', a.id_tipe_aset, a.id_tipe_hb, a.id_tipe_door) AS combined_tipe_id,
            CONCAT_WS(' / ', ta.nama_tipe, th.nama_tipe, td.nama_tipe) AS nama_tipe,
            COALESCE(ta.lantai_id, th.lantai_id, td.lantai_id) AS original_lantai_id,
            tl.nama_lantai,
            COUNT(*) AS duplicate_count,
            CASE WHEN COUNT(*) = 1 THEN 'Unique' ELSE 'Duplicate' END AS record_type
        FROM aset a
        LEFT JOIN tipe_aset ta ON a.id_tipe_aset = ta.id
        LEFT JOIN tipe_hb th ON a.id_tipe_hb = th.id
        LEFT JOIN tipe_door td ON a.id_tipe_door = td.id
        LEFT JOIN tipe_lantai tl ON tl.id = COALESCE(ta.lantai_id, th.lantai_id, td.lantai_id)
        WHERE a.client_timestamp BETWEEN ? AND ?
        GROUP BY 
            a.id_tipe_aset,
            a.id_tipe_hb,
            a.id_tipe_door,
            ta.nama_tipe,
            th.nama_tipe,
            td.nama_tipe,
            ta.lantai_id,
            th.lantai_id,
            td.lantai_id,
            tl.nama_lantai
    ),
    cte_no_aset AS (
        SELECT 
            NULL AS combined_tipe_id,
            NULL AS nama_tipe,
            tl.id AS original_lantai_id,
            tl.nama_lantai,
            0 AS duplicate_count,
            'No Record' AS record_type
        FROM tipe_lantai tl
        LEFT JOIN (
            SELECT DISTINCT COALESCE(ta.lantai_id, th.lantai_id, td.lantai_id) AS lantai_id
            FROM aset a
            LEFT JOIN tipe_aset ta ON a.id_tipe_aset = ta.id
            LEFT JOIN tipe_hb th ON a.id_tipe_hb = th.id
            LEFT JOIN tipe_door td ON a.id_tipe_door = td.id
            WHERE a.client_timestamp BETWEEN ? AND ?
        ) aset_lantai ON tl.id = aset_lantai.lantai_id
        WHERE aset_lantai.lantai_id IS NULL
    ),
    combined AS (
        SELECT 
            t.*,
            ROW_NUMBER() OVER (PARTITION BY original_lantai_id ORDER BY duplicate_count, combined_tipe_id) AS row_index_per_lantai
        FROM (
            SELECT * FROM cte_aset
            UNION ALL
            SELECT * FROM cte_no_aset
        ) t
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY original_lantai_id, row_index_per_lantai) AS overall_row_index,
        row_index_per_lantai,
        combined_tipe_id,
        nama_tipe,
        original_lantai_id AS lantai_id,
        nama_lantai,
        duplicate_count,
        record_type
    FROM combined
    ORDER BY original_lantai_id, row_index_per_lantai;
  `;
    const monitoringData = await queryAsync(monitoringSql, [startDate, endDate, startDate, endDate]);

    // 3. Query jumlah aset per lantai
    const asetSql = `
      SELECT 
          tl.id AS lantai_id,
          tl.nama_lantai,
          COALESCE(ta.total_aset, 0) + COALESCE(th.total_hb, 0) + COALESCE(td.total_door, 0) AS total_aset
      FROM tipe_lantai tl
      LEFT JOIN (
          SELECT lantai_id, COUNT(*) AS total_aset
          FROM tipe_aset
          GROUP BY lantai_id
      ) ta ON tl.id = ta.lantai_id
      LEFT JOIN (
          SELECT lantai_id, COUNT(*) AS total_hb
          FROM tipe_hb
          GROUP BY lantai_id
      ) th ON tl.id = th.lantai_id
      LEFT JOIN (
          SELECT lantai_id, COUNT(*) AS total_door
          FROM tipe_door
          GROUP BY lantai_id
      ) td ON tl.id = td.lantai_id
      ORDER BY tl.id
    `;
    const asetPerLantai = await queryAsync(asetSql);

    // Query untuk tipe_aset dengan kondisi Rusak (id_kondisi = 2)
const tipeAsetRusakSQL = `
WITH LatestAset AS (
    SELECT
        a.id_tipe_aset AS aset_id,
        ta.nama_tipe AS aset_name,
        tl.nama_lantai AS lantai_name,
        a.client_timestamp AS detected_date,
        a.catatan AS catatan,
        ROW_NUMBER() OVER (PARTITION BY a.id_tipe_aset ORDER BY a.client_timestamp DESC) AS row_num
    FROM aset a
    LEFT JOIN tipe_aset ta ON a.id_tipe_aset = ta.id
    LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
    WHERE a.id_kondisi = 2
      AND a.id_tipe_aset IS NOT NULL
      AND DATE(a.client_timestamp) BETWEEN ? AND ?
)
SELECT aset_id, aset_name, lantai_name, detected_date, catatan
FROM LatestAset
WHERE row_num = 1;
`;

// Query untuk tipe_aset dengan kondisi Hilang (id_kondisi = 3)
const tipeAsetHilangSQL = `
WITH LatestAset AS (
    SELECT
        a.id_tipe_aset AS aset_id,
        ta.nama_tipe AS aset_name,
        tl.nama_lantai AS lantai_name,
        a.client_timestamp AS detected_date,
        a.catatan AS catatan,
        ROW_NUMBER() OVER (PARTITION BY a.id_tipe_aset ORDER BY a.client_timestamp DESC) AS row_num
    FROM aset a
    LEFT JOIN tipe_aset ta ON a.id_tipe_aset = ta.id
    LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
    WHERE a.id_kondisi = 3
      AND a.id_tipe_aset IS NOT NULL
      AND DATE(a.client_timestamp) BETWEEN ? AND ?
)
SELECT aset_id, aset_name, lantai_name, detected_date, catatan
FROM LatestAset
WHERE row_num = 1;
`;

// Query untuk tipe_door dengan kondisi Rusak (id_kondisi = 2)
const tipeDoorRusakSQL = `
WITH LatestAset AS (
    SELECT
        a.id_tipe_door AS aset_id,
        td.nama_tipe AS aset_name,
        tl.nama_lantai AS lantai_name,
        a.client_timestamp AS detected_date,
        a.catatan AS catatan,
        ROW_NUMBER() OVER (PARTITION BY a.id_tipe_door ORDER BY a.client_timestamp DESC) AS row_num
    FROM aset a
    LEFT JOIN tipe_door td ON a.id_tipe_door = td.id
    LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
    WHERE a.id_kondisi = 2
      AND a.id_tipe_door IS NOT NULL
      AND DATE(a.client_timestamp) BETWEEN ? AND ?
)
SELECT aset_id, aset_name, lantai_name, detected_date, catatan
FROM LatestAset
WHERE row_num = 1;
`;

// Query untuk tipe_door dengan kondisi Hilang (id_kondisi = 3)
const tipeDoorHilangSQL = `
WITH LatestAset AS (
    SELECT
        a.id_tipe_door AS aset_id,
        td.nama_tipe AS aset_name,
        tl.nama_lantai AS lantai_name,
        a.client_timestamp AS detected_date,
        a.catatan AS catatan,
        ROW_NUMBER() OVER (PARTITION BY a.id_tipe_door ORDER BY a.client_timestamp DESC) AS row_num
    FROM aset a
    LEFT JOIN tipe_door td ON a.id_tipe_door = td.id
    LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
    WHERE a.id_kondisi = 3
      AND a.id_tipe_door IS NOT NULL
      AND DATE(a.client_timestamp) BETWEEN ? AND ?
)
SELECT aset_id, aset_name, lantai_name, detected_date, catatan
FROM LatestAset
WHERE row_num = 1;
`;

// Query untuk tipe_hb dengan kondisi Rusak (id_kondisi = 2)
const tipeHbRusakSQL = `
WITH LatestAset AS (
    SELECT
        a.id_tipe_hb AS aset_id,
        th.nama_tipe AS aset_name,
        tl.nama_lantai AS lantai_name,
        a.client_timestamp AS detected_date,
        a.catatan AS catatan,
        ROW_NUMBER() OVER (PARTITION BY a.id_tipe_hb ORDER BY a.client_timestamp DESC) AS row_num
    FROM aset a
    LEFT JOIN tipe_hb th ON a.id_tipe_hb = th.id
    LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
    WHERE a.id_kondisi = 2
      AND a.id_tipe_hb IS NOT NULL
      AND DATE(a.client_timestamp) BETWEEN ? AND ?
)
SELECT aset_id, aset_name, lantai_name, detected_date, catatan
FROM LatestAset
WHERE row_num = 1;
`;

// Query untuk tipe_hb dengan kondisi Hilang (id_kondisi = 3)
const tipeHbHilangSQL = `
WITH LatestAset AS (
    SELECT
        a.id_tipe_hb AS aset_id,
        th.nama_tipe AS aset_name,
        tl.nama_lantai AS lantai_name,
        a.client_timestamp AS detected_date,
        a.catatan AS catatan,
        ROW_NUMBER() OVER (PARTITION BY a.id_tipe_hb ORDER BY a.client_timestamp DESC) AS row_num
    FROM aset a
    LEFT JOIN tipe_hb th ON a.id_tipe_hb = th.id
    LEFT JOIN tipe_lantai tl ON a.id_tipe_lantai = tl.id
    WHERE a.id_kondisi = 3
      AND a.id_tipe_hb IS NOT NULL
      AND DATE(a.client_timestamp) BETWEEN ? AND ?
)
SELECT aset_id, aset_name, lantai_name, detected_date, catatan
FROM LatestAset
WHERE row_num = 1;
`;

// Jalankan query-query tersebut dengan parameter tanggal (startDate dan endDate)
const tipeAsetRusak   = await queryAsync(tipeAsetRusakSQL, [startDate, endDate]);
const tipeAsetHilang  = await queryAsync(tipeAsetHilangSQL, [startDate, endDate]);
const tipeDoorRusak   = await queryAsync(tipeDoorRusakSQL, [startDate, endDate]);
const tipeDoorHilang  = await queryAsync(tipeDoorHilangSQL, [startDate, endDate]);
const tipeHbRusak     = await queryAsync(tipeHbRusakSQL, [startDate, endDate]);
const tipeHbHilang    = await queryAsync(tipeHbHilangSQL, [startDate, endDate]);

// Lakukan rendering view dan kirimkan data tambahan ke template
res.render('monitoring', {
  // Data monitoring lain jika masih diperlukan
  data: monitoringData,           // Contoh data monitoring yang sudah ada
  asetPerLantai: asetPerLantai,   // Data jumlah aset per lantai
  // Data enam query kondisi baru
  tipeAsetRusak,
  tipeAsetHilang,
  tipeDoorRusak,
  tipeDoorHilang,
  tipeHbRusak,
  tipeHbHilang,
  startDate,
  endDate
});


    // 4. Render view monitoring.ejs dengan data
    res.render('monitoring', {
      data: monitoringData,
      asetPerLantai: asetPerLantai,
      startDate,
      endDate
    });
  } catch (err) {
    console.error('Error in /monitoring route:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
