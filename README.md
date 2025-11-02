# Area of Interest Map Tracer

An interactive map application that allows you to mark, trace, and zoom to specific areas of interest on a map.

## Features

- 📍 **Markers**: Place markers at specific locations
- 📏 **Lines**: Draw paths and routes
- 🔲 **Polygons**: Trace irregular areas
- ⬜ **Rectangles**: Draw rectangular regions
- ⭕ **Circles**: Mark circular areas
- 🔍 **Zoom to Area**: Automatically zoom to any drawn area
- 🗑️ **Clear All**: Remove all drawn features at once

## How to Use

1. **Open the application**: Open `index.html` in your web browser
2. **Choose a drawing tool**: Click on any of the drawing buttons (Marker, Line, Trace Area, Rectangle, or Circle)
3. **Draw on the map**: Click on the map to start drawing
   - For markers: Click once
   - For lines/polygons: Click multiple times, double-click to finish
   - For rectangles/circles: Click and drag
4. **Select an area**: Click on any drawn feature to select it (it will turn orange)
5. **Zoom to area**: Click the "Zoom to Area" button to automatically focus on the selected area
6. **Clear**: Use "Clear All" to remove all drawn features

## Technical Details

- Built with Leaflet.js (open-source mapping library)
- Uses Leaflet Draw plugin for drawing tools
- OpenStreetMap tiles (no API key required)
- Fully responsive design

## Files

- `index.html` - Main HTML file
- `styles.css` - Styling and layout
- `app.js` - Application logic and map interactions

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Opera
