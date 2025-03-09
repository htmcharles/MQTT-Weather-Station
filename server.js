// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
const db = new sqlite3.Database('./weather_data.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database');
    createTables();
  }
});

function createTables() {
  // Create tables if they don't exist
  db.run(`CREATE TABLE IF NOT EXISTS raw_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS avg_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    avg_temperature REAL,
    avg_humidity REAL,
    timestamp TEXT NOT NULL
  )`);

  console.log('Database tables created or already exist');

  // Calculate averages immediately to have initial data
  calculateAndStoreAverages();
}

// Track the latest values to calculate averages without waiting for both values
let latestTemp = null;
let latestHumidity = null;
let lastAverageTime = null;

// API Routes
// Store incoming MQTT data
app.post('/api/weather/data', (req, res) => {
  const { type, value, timestamp } = req.body;

  if (!type || value === undefined || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Update latest values
  if (type === 'temperature') {
    latestTemp = value;
  } else if (type === 'humidity') {
    latestHumidity = value;
  }

  db.run(
    'INSERT INTO raw_data (type, value, timestamp) VALUES (?, ?, ?)',
    [type, value, timestamp],
    function(err) {
      if (err) {
        console.error('Error storing data:', err);
        return res.status(500).json({ error: 'Failed to store data' });
      }

      res.status(201).json({
        message: 'Data stored successfully',
        id: this.lastID
      });
    }
  );
});

// Calculate 5-minute averages and store them
function calculateAndStoreAverages() {
  const currentTime = new Date();

  // If we've already calculated averages in the last 4 minutes, don't recalculate
  if (lastAverageTime && (currentTime - lastAverageTime < 4 * 60 * 1000)) {
    return;
  }

  const fiveMinutesAgo = new Date(currentTime - 5 * 60 * 1000).toISOString();
  const currentTimeISO = currentTime.toISOString();

  // Calculate average temperature
  db.get(
    `SELECT AVG(value) as avg_value
     FROM raw_data
     WHERE type = 'temperature' AND timestamp > ? AND timestamp <= ?`,
    [fiveMinutesAgo, currentTimeISO],
    (err, tempResult) => {
      if (err) {
        return console.error('Error calculating average temperature:', err);
      }

      // Calculate average humidity
      db.get(
        `SELECT AVG(value) as avg_value
         FROM raw_data
         WHERE type = 'humidity' AND timestamp > ? AND timestamp <= ?`,
        [fiveMinutesAgo, currentTimeISO],
        (err, humidityResult) => {
          if (err) {
            return console.error('Error calculating average humidity:', err);
          }

          // Use latest values if no data in the time range
          const avgTemp = tempResult && tempResult.avg_value ? tempResult.avg_value : latestTemp;
          const avgHumidity = humidityResult && humidityResult.avg_value ? humidityResult.avg_value : latestHumidity;

          // Only store if we have data
          if (avgTemp !== null || avgHumidity !== null) {
            db.run(
              'INSERT INTO avg_data (avg_temperature, avg_humidity, timestamp) VALUES (?, ?, ?)',
              [avgTemp, avgHumidity, currentTimeISO],
              function(err) {
                if (err) {
                  console.error('Error storing average data:', err);
                } else {
                  console.log('Stored 5-minute averages successfully at', new Date().toLocaleTimeString());
                  lastAverageTime = currentTime;
                }
              }
            );
          }
        }
      );
    }
  );
}

// Get historical averaged data for the chart
app.get('/api/weather/history', (req, res) => {
  // Get the last 12 entries (1 hour of data with 5-minute intervals)
  db.all(
    `SELECT avg_temperature, avg_humidity, timestamp
     FROM avg_data
     ORDER BY timestamp DESC
     LIMIT 12`,
    (err, rows) => {
      if (err) {
        console.error('Error fetching historical data:', err);
        return res.status(500).json({ error: 'Failed to fetch historical data' });
      }

      // Return the data in chronological order
      res.json(rows.reverse());
    }
  );
});

// Calculate 5-minute averages more frequently to ensure we have data
setInterval(calculateAndStoreAverages, 60 * 1000); // Check every minute

// Endpoint to get historical weather data
app.get('/api/weather/historical', (req, res) => {
  const timeWindow = 45 * 60 * 1000; // 45 minutes in milliseconds (9 intervals of 5 minutes plus current time)
  const cutoffTime = new Date(Date.now() - timeWindow).toISOString();

  db.all(
    `SELECT type, value, timestamp
     FROM raw_data
     WHERE timestamp >= ?
     ORDER BY timestamp ASC`,
    [cutoffTime],
    (err, rows) => {
      if (err) {
        console.error('Error fetching historical data:', err);
        res.status(500).json({ error: 'Failed to fetch historical data' });
        return;
      }
      res.json(rows);
    }
  );
});

// Database Viewer Routes
app.get('/db-viewer', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SQLite Database Viewer</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        :root {
          --primary-color: #FFB84D;
          --secondary-color: #006B5F;
          --accent-color: #FFB84D;
          --bg-dark: #006B5F;
          --bg-card: #006B5F;
          --text-primary: #F8FAFC;
          --text-secondary: #B4CCC9;
          --border-color: rgba(180, 204, 201, 0.1);
          --shadow-color: rgba(0, 0, 0, 0.3);
          --gradient-1: linear-gradient(135deg, #FFB84D, #F59E0B);
          --gradient-2: linear-gradient(135deg, #FFB84D, #F59E0B);
          --card-hover: #007D6F;
        }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--bg-dark);
          color: var(--text-primary);
          margin: 20px;
        }

        h1, h2 {
          color: var(--text-primary);
          font-weight: 600;
        }

        h1 {
          font-size: 2.5rem;
          background: var(--gradient-1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 30px;
          background: var(--bg-card);
          border-radius: 1rem;
          box-shadow: 0 8px 32px var(--shadow-color);
          border: 1px solid var(--border-color);
        }

        th, td {
          border: 1px solid var(--border-color);
          padding: 12px;
          text-align: left;
          color: var(--text-primary);
        }

        th {
          background-color: rgba(255, 255, 255, 0.1);
          font-weight: 500;
          color: var(--primary-color);
        }

        tr:nth-child(even) {
          background-color: rgba(255, 255, 255, 0.05);
        }

        tr:hover {
          background-color: var(--card-hover);
        }

        a {
          color: var(--primary-color);
          text-decoration: none;
          transition: color 0.3s ease;
        }

        a:hover {
          color: var(--accent-color);
        }

        ul {
          list-style: none;
          padding: 0;
        }

        li {
          margin: 10px 0;
          padding: 10px;
          background: var(--bg-card);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          transition: transform 0.3s ease;
        }

        li:hover {
          transform: translateX(10px);
          background: var(--card-hover);
        }

        p {
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>SQLite Database Viewer</h1>
        <h2>Tables</h2>
        <ul>
          <li><a href="/db-viewer/raw-data">raw_data</a></li>
          <li><a href="/db-viewer/avg-data">avg_data</a></li>
        </ul>
        <p>Click on a table name to view its data.</p>
      </div>
    </body>
    </html>
  `);
});

// View raw_data table
app.get('/db-viewer/raw-data', (req, res) => {
  db.all('SELECT * FROM raw_data ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
    if (err) {
      return res.status(500).send('Error fetching data: ' + err.message);
    }

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>raw_data Table</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        :root {
          --primary-color: #FFB84D;
          --secondary-color: #006B5F;
          --accent-color: #FFB84D;
          --bg-dark: #006B5F;
          --bg-card: #006B5F;
          --text-primary: #F8FAFC;
          --text-secondary: #B4CCC9;
          --border-color: rgba(180, 204, 201, 0.1);
          --shadow-color: rgba(0, 0, 0, 0.3);
          --gradient-1: linear-gradient(135deg, #FFB84D, #F59E0B);
          --gradient-2: linear-gradient(135deg, #FFB84D, #F59E0B);
          --card-hover: #007D6F;
        }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--bg-dark);
          color: var(--text-primary);
          margin: 20px;
        }

        h1 {
          font-size: 2.5rem;
          font-weight: 600;
          background: var(--gradient-1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 30px;
          background: var(--bg-card);
          border-radius: 1rem;
          box-shadow: 0 8px 32px var(--shadow-color);
          border: 1px solid var(--border-color);
        }

        th, td {
          border: 1px solid var(--border-color);
          padding: 12px;
          text-align: left;
          color: var(--text-primary);
        }

        th {
          background-color: rgba(255, 255, 255, 0.1);
          font-weight: 500;
          color: var(--primary-color);
        }

        tr:nth-child(even) {
          background-color: rgba(255, 255, 255, 0.05);
        }

        tr:hover {
          background-color: var(--card-hover);
        }

        .nav {
          margin-bottom: 20px;
        }

        a {
          color: var(--primary-color);
          text-decoration: none;
          transition: color 0.3s ease;
        }

        a:hover {
          color: var(--accent-color);
        }

        p {
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
      </style>
      <meta http-equiv="refresh" content="30"> <!-- Auto-refresh page every 30 seconds -->
    </head>
    <body>
      <div class="container">
        <div class="nav">
          <a href="/db-viewer">← Back to Tables</a>
        </div>
        <h1>raw_data Table</h1>
        <p>Showing latest 100 records (auto-refreshes every 30 seconds)</p>
    `;

    if (rows.length === 0) {
      html += '<p>No data found in this table.</p>';
    } else {
      html += '<table><tr>';

      // Table headers
      Object.keys(rows[0]).forEach(key => {
        html += `<th>${key}</th>`;
      });
      html += '</tr>';

      // Table data
      rows.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(value => {
          html += `<td>${value}</td>`;
        });
        html += '</tr>';
      });

      html += '</table>';
    }

    html += `
        <div class="nav">
          <a href="/db-viewer">← Back to Tables</a>
        </div>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  });
});

// View avg_data table
app.get('/db-viewer/avg-data', (req, res) => {
  db.all('SELECT * FROM avg_data ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
    if (err) {
      return res.status(500).send('Error fetching data: ' + err.message);
    }

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>avg_data Table</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        :root {
          --primary-color: #FFB84D;
          --secondary-color: #006B5F;
          --accent-color: #FFB84D;
          --bg-dark: #006B5F;
          --bg-card: #006B5F;
          --text-primary: #F8FAFC;
          --text-secondary: #B4CCC9;
          --border-color: rgba(180, 204, 201, 0.1);
          --shadow-color: rgba(0, 0, 0, 0.3);
          --gradient-1: linear-gradient(135deg, #FFB84D, #F59E0B);
          --gradient-2: linear-gradient(135deg, #FFB84D, #F59E0B);
          --card-hover: #007D6F;
        }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--bg-dark);
          color: var(--text-primary);
          margin: 20px;
        }

        h1 {
          font-size: 2.5rem;
          font-weight: 600;
          background: var(--gradient-1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 30px;
          background: var(--bg-card);
          border-radius: 1rem;
          box-shadow: 0 8px 32px var(--shadow-color);
          border: 1px solid var(--border-color);
        }

        th, td {
          border: 1px solid var(--border-color);
          padding: 12px;
          text-align: left;
          color: var(--text-primary);
        }

        th {
          background-color: rgba(255, 255, 255, 0.1);
          font-weight: 500;
          color: var(--primary-color);
        }

        tr:nth-child(even) {
          background-color: rgba(255, 255, 255, 0.05);
        }

        tr:hover {
          background-color: var(--card-hover);
        }

        .nav {
          margin-bottom: 20px;
        }

        a {
          color: var(--primary-color);
          text-decoration: none;
          transition: color 0.3s ease;
        }

        a:hover {
          color: var(--accent-color);
        }

        p {
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
      </style>
      <meta http-equiv="refresh" content="30"> <!-- Auto-refresh page every 30 seconds -->
    </head>
    <body>
      <div class="container">
        <div class="nav">
          <a href="/db-viewer">← Back to Tables</a>
        </div>
        <h1>avg_data Table</h1>
        <p>Showing latest 100 records (auto-refreshes every 30 seconds)</p>
    `;

    if (rows.length === 0) {
      html += '<p>No data found in this table.</p>';
    } else {
      html += '<table><tr>';

      // Table headers
      Object.keys(rows[0]).forEach(key => {
        html += `<th>${key}</th>`;
      });
      html += '</tr>';

      // Table data
      rows.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(value => {
          html += `<td>${value}</td>`;
        });
        html += '</tr>';
      });

      html += '</table>';
    }

    html += `
        <div class="nav">
          <a href="/db-viewer">← Back to Tables</a>
        </div>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
