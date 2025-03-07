# MQTT Weather Station

A real-time weather monitoring system that displays temperature and humidity data using MQTT protocol, with a beautiful web interface for data visualization.

## Features

- Real-time temperature and humidity monitoring
- Beautiful, responsive web interface
- Interactive graph showing historical data (last 45 minutes)
- 5-minute interval data points
- Real-time updates
- Smooth animations and modern UI

## Prerequisites

- Node.js (v12.0 or higher)
- npm (Node Package Manager)
- MQTT Broker (e.g., Mosquitto)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/htmcharles/MQTT-Weather-Station.git
   cd MQTT-Weather-Station
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the server:
   ```bash
   node server.js
   ```

2. Access the web interface:
   - Open index.html
   - The interface will automatically display real-time data

3. Monitor the data:
   - Current temperature and humidity are displayed at the top
   - The graph shows historical data for the last 45 minutes
   - Data points are plotted every 5 minutes
   - Real-time updates occur.
   - You can view only the temperature or humidity by clicking on the other to not display it click on the title in the graph of opposite.

## Project Structure

```
MQTT-Weather-Station/
├── index.html          # Web interface
├── server.js            # Backend server files
└── README.md         # This file
```

## Customization

You can customize the following aspects:

1. Update graph settings in `index.html`:
   - Change colors, styles, and animations
   - Modify time intervals
   - Adjust graph dimensions

2. Modify data collection intervals:
   - Change the real-time update frequency
   - Adjust historical data interval (default: 5 minutes)
   - Update the total time window (default: 45 minutes)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- Chart.js for the beautiful graphs

## Contact

Project Link: [https://github.com/htmcharles/MQTT-Weather-Station](https://github.com/htmcharles/MQTT-Weather-Station)
