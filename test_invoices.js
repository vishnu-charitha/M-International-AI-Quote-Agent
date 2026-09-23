const http = require('http');
http.get('http://localhost:3001/api/invoices', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('INVOICES:', data));
}).on('error', (err) => console.log('Error:', err.message));
