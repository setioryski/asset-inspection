const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

module.exports = function(app) {
    // SSL credentials (adjust paths based on your home directory structure)
    const privateKey = fs.readFileSync(path.join(__dirname, 'certs/server.key'), 'utf8');
    const certificate = fs.readFileSync(path.join(__dirname, 'certs/server.crt'), 'utf8');
    const ca = fs.readFileSync(path.join(__dirname, 'certs/ca_bundle.crt'), 'utf8'); // Optional CA certificate

    const credentials = { key: privateKey, cert: certificate, ca };

    // HTTPS server
    const httpsServer = https.createServer(credentials, app);

    // Redirect HTTP to HTTPS
    const httpServer = http.createServer((req, res) => {
        res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
        res.end();
    });

    // Listen on HTTP (port 80) and HTTPS (port 443)
    httpsServer.listen(443, () => {
        console.log('HTTPS Server running on port 443');
    });

    httpServer.listen(80, () => {
        console.log('HTTP Server running on port 80 and redirecting to HTTPS');
    });
};
