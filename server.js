const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const db = new sqlite3.Database("weather.db");

app.use(cors());
app.use(bodyParser.json());

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS weather (
            id INTEGER PRIMARY KEY,
            type TEXT,
            value REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Store sensor data
app.post("/store", (req, res) => {
    const { type, value } = req.body;
    db.run(
        "INSERT INTO weather (type, value) VALUES (?, ?)",
        [type, value],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({ success: true });
        }
    );
});

// Retrieve data grouped in 10-second intervals
app.get("/data", (req, res) => {
    db.all(`
        SELECT
            strftime('%Y-%m-%d %H:%M:%S', timestamp) AS time_group,
            AVG(CASE WHEN type='temperature' THEN value END) AS temperature,
            AVG(CASE WHEN type='humidity' THEN value END) AS humidity
        FROM weather
        GROUP BY strftime('%s', timestamp) / 10
        ORDER BY time_group DESC
        LIMIT 50
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(3000, () => console.log("Server running on port 3000"));
