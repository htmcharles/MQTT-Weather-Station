# MQTT Weather Station

This application collects temperature and humidity data from an MQTT broker, stores it in an SQLite database, and visualizes it with real-time updates and 5-minute averages.

## Features

- 🌡️ Real-time temperature and humidity monitoring
- 📊 Interactive charts showing 5-minute averages
- 💾 SQLite database storage for historical data
- 📱 Responsive design for desktop and mobile

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mqtt-weather-app
   cd mqtt-weather-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `public` directory and place the `index.html` file inside:
   ```bash
   mkdir -p public
   cp index.html public/
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Access the application:
   Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
mqtt-weather-app/
├── public/
│   └── index.html       # Frontend interface with Chart.js visualization
├── server.js            # Express backend with API endpoints and SQLite logic
├── package.json         # Node.js dependencies
├── weather_data.db      # SQLite database (created automatically)
└── README.md            # Setup instructions
```

## How It Works

1. The frontend connects to the MQTT broker and displays real-time temperature and humidity values
2. Each MQTT message is sent to the backend and stored in the SQLite database
3. Every 5 minutes, the backend calculates averages and stores them in a separate table
4. The chart displays up to one hour of historical data (twelve 5-minute intervals)

## API Endpoints

- `POST /api/weather/data` - Store raw temperature and humidity readings
- `GET /api/weather/history` - Retrieve historical data for charting

## Database Schema

### Raw Data Table
Stores every reading received from MQTT:
```sql
CREATE TABLE raw_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,        -- 'temperature' or 'humidity'
  value REAL NOT NULL,       -- The actual reading
  timestamp TEXT NOT NULL    -- ISO format timestamp
);
```

### Average Data Table
Stores 5-minute averages:
```sql
CREATE TABLE avg_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avg_temperature REAL,      -- 5-minute average temperature
  avg_humidity REAL,         -- 5-minute average humidity
  timestamp TEXT NOT NULL    -- ISO format timestamp
);
#### RUN THE FOLLOWING  TO THE TERMINAL 

1.Navigate to the directory
2.Run   node server.js   or   http://localhost:3000/"# Embeded" 
