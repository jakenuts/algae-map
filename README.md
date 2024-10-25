# Algae Bloom Map

This project is a React-based web application that visualizes Harmful Algal Bloom (HAB) reports in California using data from the California Open Data portal.

## Project Overview

The Algae Bloom Map application:

1. Loads HAB report data from a CSV file provided by the California Open Data portal.
2. Filters the data to show only reports from the last 90 days.
3. Interprets the report data to categorize the severity of each bloom.
4. Maps the filtered and interpreted data using Leaflet, an open-source JavaScript library for interactive maps.

## Features

- Interactive map showing locations of recent algal blooms
- Color-coded markers indicating the severity of each bloom
- Popup information for each marker showing detailed report data
- Dynamically resizing markers based on zoom level for improved visibility
- Responsive design for use on various devices

## Data Source

The data used in this application comes from the California Harmful Algal Blooms (HABs) Portal. While we strive to provide accurate and up-to-date information, users should note that this application is for informational purposes only.

## Development

### Local Data Mode

During development, you can use a local cached version of the bloom data instead of fetching from the API. To enable this:

1. Set `VITE_USE_LOCAL_BLOOM_DATA=true` in your `.env.development` file
2. Ensure you have the latest bloom data in `docs/bloom-report.csv`

This feature is particularly useful for offline development or when you want to work with a stable dataset.

## Legal Disclaimer

This map is for informational purposes only. For the most up-to-date and official information, please visit the [California Harmful Algal Blooms Portal](https://www.mywaterquality.ca.gov/habs/where/freshwater_events.html).

## License

This project is open source and available under the [MIT License](LICENSE).

## Getting Started

To run this project locally:

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`
4. Open your browser and navigate to `http://localhost:5173` (or the port specified in your terminal)

## Contributing

This is an open-source effort, and contributions are welcome. Please feel free to submit pull requests or open issues to improve the application.

## Acknowledgments

This project uses data provided by the State of California's Open Data Portal. We thank them for their commitment to open data and public information.
