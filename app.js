// Initialize the map
const map = L.map('map').setView([40.7128, -74.0060], 10); // Default to New York

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Store all drawn features
let drawnFeatures = [];
let selectedFeature = null;
let currentDrawControl = null;
const STORAGE_KEY = 'mapAreaTracer_drawings';

// Initialize draw controls
const drawControls = {
    marker: new L.Draw.Marker(map),
    polyline: new L.Draw.Polyline(map),
    polygon: new L.Draw.Polygon(map),
    rectangle: new L.Draw.Rectangle(map),
    circle: new L.Draw.Circle(map)
};

// Feature group to store all drawn items
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Store search marker
let searchMarker = null;

// Search functionality
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');

// Search event handlers
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target) && !searchBtn.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

// Perform geocoding search
async function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        searchResults.innerHTML = '<div class="no-results">Please enter a search term</div>';
        searchResults.classList.add('active');
        return;
    }
    
    searchResults.innerHTML = '<div class="loading">🔍 Searching...</div>';
    searchResults.classList.add('active');
    
    try {
        // Use Nominatim geocoding API (free, no API key required)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
            {
                headers: {
                    'User-Agent': 'MapAreaTracer/1.0' // Required by Nominatim
                }
            }
        );
        
        const data = await response.json();
        
        if (data.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No results found. Try a different search term.</div>';
            return;
        }
        
        // Display results
        searchResults.innerHTML = '';
        data.forEach(result => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            const name = result.display_name.split(',')[0];
            const details = result.display_name;
            
            item.innerHTML = `
                <div class="result-name">${name}</div>
                <div class="result-details">${details}</div>
            `;
            
            item.addEventListener('click', () => {
                selectSearchResult(result);
            });
            
            searchResults.appendChild(item);
        });
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<div class="no-results">Error searching. Please try again.</div>';
    }
}

// Select a search result and zoom to it
function selectSearchResult(result) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const location = [lat, lon];
    
    // Remove previous search marker
    if (searchMarker) {
        map.removeLayer(searchMarker);
    }
    
    // Add new marker for searched location (using default Leaflet marker)
    searchMarker = L.marker(location).addTo(map);
    
    searchMarker.bindPopup(`<b>${result.display_name}</b><br>Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`).openPopup();
    
    // Zoom to location
    map.setView(location, 14);
    
    // Close search results
    searchResults.classList.remove('active');
    searchInput.value = result.display_name;
    
    updateAreaInfo(`Found: ${result.display_name}`);
}

// Button event handlers
document.getElementById('draw-marker').addEventListener('click', () => {
    activateDrawControl('marker');
});

document.getElementById('draw-polyline').addEventListener('click', () => {
    activateDrawControl('polyline');
});

document.getElementById('draw-polygon').addEventListener('click', () => {
    activateDrawControl('polygon');
});

document.getElementById('draw-rectangle').addEventListener('click', () => {
    activateDrawControl('rectangle');
});

document.getElementById('draw-circle').addEventListener('click', () => {
    activateDrawControl('circle');
});

document.getElementById('zoom-to-area').addEventListener('click', () => {
    zoomToSelectedArea();
});

document.getElementById('clear-all').addEventListener('click', () => {
    clearAll();
});

document.getElementById('delete-selected').addEventListener('click', () => {
    deleteSelected();
});

// Activate a draw control
function activateDrawControl(type) {
    // Deactivate current control
    if (currentDrawControl) {
        currentDrawControl.disable();
    }
    
    // Remove active class from all buttons
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activate selected control
    currentDrawControl = drawControls[type];
    currentDrawControl.enable();
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Handle draw events
map.on(L.Draw.Event.CREATED, (event) => {
    const layer = event.layer;
    drawnItems.addLayer(layer);
    drawnFeatures.push(layer);
    
    // Store unique ID for each feature
    if (!layer.feature) {
        layer.feature = {};
    }
    layer.feature.id = Date.now() + Math.random();
    
    // Make the layer clickable
    layer.on('click', function() {
        selectFeature(this);
    });
    
    // Disable draw control after creation
    if (currentDrawControl) {
        currentDrawControl.disable();
        currentDrawControl = null;
        
        // Remove active class from buttons
        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    saveToLocalStorage();
    updateAreaInfo();
});

map.on(L.Draw.Event.DRAWSTART, () => {
    updateAreaInfo('Drawing... Click on the map to start.');
});

map.on(L.Draw.Event.DRAWSTOP, () => {
    updateAreaInfo();
});

// Select a feature
function selectFeature(layer) {
    // Deselect previous feature
    if (selectedFeature && selectedFeature !== layer) {
        selectedFeature.setStyle({
            color: '#3388ff',
            weight: 3
        });
    }
    
    // Select new feature
    selectedFeature = layer;
    previousSelectedFeature = layer; // Track for deselection logic
    layer.setStyle({
        color: '#ff7800',
        weight: 4
    });
    
    // Show delete button when feature is selected
    document.getElementById('delete-selected').style.display = 'inline-block';
    
    updateAreaInfo();
    layer.bringToFront();
}

// Zoom to selected area
function zoomToSelectedArea() {
    if (selectedFeature) {
        const bounds = selectedFeature.getBounds ? selectedFeature.getBounds() : null;
        
        if (bounds) {
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 16
            });
        } else if (selectedFeature instanceof L.Marker) {
            map.setView(selectedFeature.getLatLng(), 15);
        } else if (selectedFeature instanceof L.Circle) {
            const radius = selectedFeature.getRadius();
            const center = selectedFeature.getLatLng();
            const bounds = L.latLngBounds(
                [center.lat - radius/111000, center.lng - radius/111000],
                [center.lat + radius/111000, center.lng + radius/111000]
            );
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 16
            });
        }
        
        updateAreaInfo('Zoomed to selected area!');
    } else {
        alert('Please select an area first by clicking on it.');
    }
}

// Delete selected feature
function deleteSelected() {
    if (!selectedFeature) {
        alert('Please select a feature to delete first.');
        return;
    }
    
    if (confirm('Are you sure you want to delete this drawing?')) {
        // Remove from map
        drawnItems.removeLayer(selectedFeature);
        
        // Remove from array
        const index = drawnFeatures.indexOf(selectedFeature);
        if (index > -1) {
            drawnFeatures.splice(index, 1);
        }
        
        selectedFeature = null;
        
        // Hide delete button
        document.getElementById('delete-selected').style.display = 'none';
        
        saveToLocalStorage();
        updateAreaInfo('Drawing deleted.');
    }
}

// Clear all drawn features
function clearAll() {
    if (confirm('Are you sure you want to clear all drawn areas?')) {
        drawnItems.clearLayers();
        drawnFeatures = [];
        selectedFeature = null;
        
        // Hide delete button
        document.getElementById('delete-selected').style.display = 'none';
        
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);
        
        updateAreaInfo('All areas cleared.');
    }
}

// Update area info panel
function updateAreaInfo(message = null) {
    const infoPanel = document.getElementById('area-info');
    
    if (message) {
        infoPanel.innerHTML = `<strong>Status:</strong> ${message}`;
        return;
    }
    
    let info = `<strong>Map Info:</strong><ul>`;
    
    if (drawnFeatures.length === 0) {
        info += `<li>No areas drawn yet. Use the tools above to mark areas.</li>`;
    } else {
        info += `<li>Total areas drawn: <strong>${drawnFeatures.length}</strong></li>`;
        
        if (selectedFeature) {
            const featureType = getFeatureType(selectedFeature);
            info += `<li>Selected: <strong>${featureType}</strong></li>`;
            
            // Calculate area for polygons, rectangles, and circles
            if (selectedFeature instanceof L.Polygon || selectedFeature instanceof L.Rectangle) {
                const area = L.GeometryUtil.geodesicArea(selectedFeature.getLatLngs()[0]);
                info += `<li>Area: <strong>${(area / 1000000).toFixed(2)} km²</strong> (${(area / 10000).toFixed(2)} hectares)</li>`;
            } else if (selectedFeature instanceof L.Circle) {
                const radius = selectedFeature.getRadius();
                const area = Math.PI * radius * radius;
                info += `<li>Radius: <strong>${radius.toFixed(0)} m</strong></li>`;
                info += `<li>Area: <strong>${(area / 1000000).toFixed(2)} km²</strong></li>`;
            } else if (selectedFeature instanceof L.Polyline) {
                const distance = calculatePolylineDistance(selectedFeature);
                info += `<li>Length: <strong>${(distance / 1000).toFixed(2)} km</strong> (${distance.toFixed(0)} m)</li>`;
            }
            
            info += `<li>Click "Zoom to Area" button to focus on this area.</li>`;
        } else {
            info += `<li>Click on any drawn area to select it.</li>`;
        }
    }
    
    info += `</ul>`;
    infoPanel.innerHTML = info;
}

// Get feature type name
function getFeatureType(feature) {
    if (feature instanceof L.Marker) return 'Marker';
    if (feature instanceof L.Polyline) return 'Line';
    if (feature instanceof L.Polygon) return 'Polygon';
    if (feature instanceof L.Rectangle) return 'Rectangle';
    if (feature instanceof L.Circle) return 'Circle';
    return 'Unknown';
}

// Calculate polyline distance
function calculatePolylineDistance(polyline) {
    const latlngs = polyline.getLatLngs();
    let totalDistance = 0;
    
    for (let i = 0; i < latlngs.length - 1; i++) {
        totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);
    }
    
    return totalDistance;
}

// Save drawn features to localStorage
function saveToLocalStorage() {
    try {
        const features = [];
        drawnFeatures.forEach(layer => {
            let feature;
            
            // Handle circles specially (GeoJSON doesn't support circles)
            if (layer instanceof L.Circle) {
                const center = layer.getLatLng();
                const radius = layer.getRadius();
                feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Circle'
                    },
                    properties: {
                        centerLat: center.lat,
                        centerLng: center.lng,
                        radius: radius
                    },
                    id: layer.feature?.id || Date.now() + Math.random()
                };
            } else {
                feature = layer.toGeoJSON();
                // Preserve the ID
                if (layer.feature?.id) {
                    feature.id = layer.feature.id;
                }
                if (!feature.properties) {
                    feature.properties = {};
                }
                if (feature.id) {
                    feature.properties.id = feature.id;
                }
            }
            
            features.push(feature);
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Load drawn features from localStorage
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        
        const features = JSON.parse(saved);
        if (!Array.isArray(features) || features.length === 0) return;
        
        features.forEach(featureData => {
            let layer;
            
            // Handle different geometry types
            if (featureData.geometry.type === 'Point') {
                layer = L.marker([featureData.geometry.coordinates[1], featureData.geometry.coordinates[0]]);
            } else if (featureData.geometry.type === 'LineString') {
                const latlngs = featureData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                layer = L.polyline(latlngs);
            } else if (featureData.geometry.type === 'Polygon') {
                const latlngs = featureData.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                layer = L.polygon(latlngs);
            } else if (featureData.geometry.type === 'Circle') {
                // For circles, we need to restore center and radius from properties
                const center = [featureData.properties.centerLat, featureData.properties.centerLng];
                const radius = featureData.properties.radius || 1000;
                layer = L.circle(center, { radius: radius });
            } else {
                // Fallback to GeoJSON layer
                layer = L.GeoJSON.geometryToLayer(featureData, {
                    pointToLayer: function(feature, latlng) {
                        return L.marker(latlng);
                    }
                });
            }
            
            // Restore style for lines and shapes
            if (layer instanceof L.Polyline || layer instanceof L.Polygon || layer instanceof L.Circle) {
                layer.setStyle({
                    color: '#3388ff',
                    weight: 3,
                    fillOpacity: 0.2
                });
            }
            
            // Store unique ID
            if (!layer.feature) {
                layer.feature = {};
            }
            layer.feature.id = featureData.id || featureData.properties?.id || Date.now() + Math.random();
            
            // Make clickable
            layer.on('click', function() {
                selectFeature(this);
            });
            
            drawnItems.addLayer(layer);
            drawnFeatures.push(layer);
        });
        
        updateAreaInfo(`Loaded ${features.length} saved drawing(s).`);
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// Handle map click to deselect
let previousSelectedFeature = null;
map.on('click', function(e) {
    // Small delay to let feature click handlers run first
    setTimeout(() => {
        // If we still have the same selected feature and it wasn't changed by a feature click
        if (selectedFeature && selectedFeature === previousSelectedFeature) {
            // Check if click was on empty map space
            const clickedPoint = e.latlng;
            let clickedOnFeature = false;
            
            // Check each feature to see if the click was on it
            for (let feature of drawnFeatures) {
                if (feature instanceof L.Marker) {
                    // For markers, check if click is very close
                    const markerPos = feature.getLatLng();
                    if (clickedPoint.distanceTo(markerPos) < 0.0005) { // ~50 meters
                        clickedOnFeature = true;
                        break;
                    }
                } else if (feature.getBounds && feature.getBounds().contains(clickedPoint)) {
                    clickedOnFeature = true;
                    break;
                }
            }
            
            // Only deselect if we clicked on empty space
            if (!clickedOnFeature) {
                selectedFeature.setStyle({
                    color: '#3388ff',
                    weight: 3
                });
                selectedFeature = null;
                previousSelectedFeature = null;
                document.getElementById('delete-selected').style.display = 'none';
                updateAreaInfo();
            }
        }
        previousSelectedFeature = selectedFeature;
    }, 100);
});

// Initialize: Load saved features and update info panel
loadFromLocalStorage();
updateAreaInfo();
