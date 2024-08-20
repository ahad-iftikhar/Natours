const locations = JSON.parse(document.getElementById('map').dataset.locations); // Getting locations data from pug template, we have created a string of all the locations in pug template and set it into a dataset and we are accessing it here.

mapboxgl.accessToken =
  'pk.eyJ1IjoiYWJkdWxhaGFkNzciLCJhIjoiY2x6Y3ZoOHZpMGJhNzJxczllaG4wazM1aiJ9.mQSBdUqVAZ_Pf4oDtQ1F6A';

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/abdulahad77/clzczl6er00an01qw0h28hwya',
  scrollZoom: false,
  //   center: [-118.113491, 34.111745],
  //   zoom: 10,
  //   interactive: false,
});

const bounds = new mapboxgl.LngLatBounds();

locations.forEach((loc) => {
  // Create Marker
  const el = document.createElement('div');
  el.className = 'marker';

  // Add Marker
  new mapboxgl.Marker({
    element: el,
    anchor: 'bottom',
  })
    .setLngLat(loc.coordinates)
    .addTo(map);

  // Add popup
  new mapboxgl.Popup({
    offset: 30,
  })
    .setLngLat(loc.coordinates)
    .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
    .addTo(map);

  //Extend map bounds to include current location
  bounds.extend(loc.coordinates);
});

map.fitBounds(bounds, {
  padding: {
    top: 200,
    bottom: 150,
    left: 100,
    right: 100,
  },
});
