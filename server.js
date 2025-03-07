const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const mqtt = require("mqtt");
const cors = require("cors");

const app = express();
app.use(cors());

// Initialize SQLite
const db = new sqlite3.Database("weather_station.db", (err) => {
    if (err) console.error(err.message);
    console.log("Connected to SQLite database.");
});

// Create Table (if not exists)
db.run(`
    CREATE TABLE IF NOT EXISTS weather_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        temperature REAL,
        humidity REAL
    )
`);

// MQTT Connection
const mqttClient = mqtt.connect("ws://157.173.101.159:9001");
let latestData = { temperature: null, humidity: null };

mqttClient.on("connect", () => {
    console.log("Connected to MQTT");
    mqttClient.subscribe("/work_group_01/room_temp/temperature");
    mqttClient.subscribe("/work_group_01/room_temp/humidity");
});

mqttClient.on("message", (topic, message) => {
    const value = parseFloat(message.toString());

    if (topic === "/work_group_01/room_temp/temperature") {
        latestData.temperature = value;
    } else if (topic === "/work_group_01/room_temp/humidity") {
        latestData.humidity = value;
    }

    if (latestData.temperature !== null && latestData.humidity !== null) {
        db.run(
            `INSERT INTO weather_measurements (temperature, humidity) VALUES (?, ?)`,
            [latestData.temperature, latestData.humidity],
            (err) => {
                if (err) console.error(err.message);
            }
        );
    }
});

// API to get latest temperature & humidity
app.get("/latest", (req, res) => {
    db.get(`SELECT * FROM weather_measurements ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || { temperature: "--", humidity: "--" });
    });
});

// API to get last 1 hour of data for graph
app.get("/data", (req, res) => {
    db.all(
        `SELECT
            strftime('%Y-%m-%d %H:%M:00', datetime(timestamp, 'localtime')) as timestamp,
            ROUND(AVG(temperature), 1) as temperature,
            ROUND(AVG(humidity), 1) as humidity
        FROM weather_measurements
        WHERE timestamp >= datetime('now', '-1 hour')
        GROUP BY strftime('%Y-%m-%d %H:%M:00', datetime(timestamp, 'localtime'))
        ORDER BY timestamp DESC`,
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
