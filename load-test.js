import http from 'k6/http';
import { check } from 'k6';

export let options = {
    vus: 10, // 10 concurrent users
    iterations: 200, // 20 entries per user = 10 users x 20 = 200 iterations
};

export default function () {
    const url = 'http://localhost:3000/upload'; // Replace with your API endpoint

    const payload = JSON.stringify({
        catatan: 'Test catatan',
        id_user: 1,
        id_tipe_aset: 1,
        id_tipe_lantai: 1,
        id_kondisi: 1,
        id_tipe_hb: 1,
        id_tipe_door: 1,
        clientTimestamp: new Date().toISOString(),
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(url, payload, params);

    // Validate response
    check(res, {
        'is status 200': (r) => r.status === 200,
        'is success true': (r) => JSON.parse(r.body).success === true,
    });
}

