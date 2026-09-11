// map_layers.js

const fontName = 'Roboto_Regular';

function reduceGeometryCollections(features) {
    // Primarily to reduce Index Villaris data
    return features
        .filter(feature => {
            if (feature.geometry?.type === "GeometryCollection" && Array.isArray(feature.geometry.geometries)) {
                const firstPoint = feature.geometry.geometries.find(geom => geom.type === "Point");
                return firstPoint && firstPoint.certainty === 'certain';
            }
            return false;
        })
        .map(feature => {
        return {
            type: feature.type,
            "@id": feature["@id"],
            properties: {
                title: feature.properties?.title ?? null,
                market: feature.properties?.glyphs?.includes("market") || false,
            },
            geometry: {
                type: "Point",
                coordinates: feature.geometry.geometries.find(geom => geom.type === "Point").coordinates || null
            }
        };
    });
}

function clusterPoints(url, map, sourceName, attribution, hasGeometryCollections = false) {
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            const features = data.features || [];
            let londonFeature = null;
            let otherFeatures = [];

            for (const feature of features) {
                if (feature.properties?.title === 'London') {
                    londonFeature = feature;
                    londonFeature.geometry.coordinates = londonCoordinates;
                } else {
                    otherFeatures.push(feature);
                }
            }

            if (hasGeometryCollections) {
                otherFeatures = reduceGeometryCollections(otherFeatures);
            }

            // Add clustered source for non-London features
            map.addSource(sourceName, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: otherFeatures
                },
                cluster: true,
                clusterMaxZoom: 9,
                clusterRadius: 40,
                attribution
            });

            // Cluster circles
            map.addLayer({
                id: `${sourceName}-clusters`,
                type: 'circle',
                source: sourceName,
                filter: ['has', 'point_count'],
                minzoom: 5,
                paint: {
                    'circle-color': 'rgba(108,117,125,0.5)',
                    'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 25],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                }
            });

            // Cluster counts
            map.addLayer({
                id: `${sourceName}-cluster-count`,
                type: 'symbol',
                source: sourceName,
                filter: ['has', 'point_count'],
                minzoom: 5,
                layout: {
                    'text-field': ['get', 'point_count'],
                    'text-font': [fontName],
                    'text-size': 12
                },
                paint: {
                    'text-color': '#fff'
                }
            });

            // Unclustered point styling
            map.addLayer({
                id: `${sourceName}-unclustered-point`,
                type: 'circle',
                source: sourceName,
                filter: ['!', ['has', 'point_count']],
                minzoom: 5,
                paint: {
                    'circle-color': [
                        'case',
                        ['==', ['get', 'head_port'], true],
                        '#d62f2f',       // red for head_port
                        ['==', ['get', 'Is_Town'], 'y'],
                        'orange',        // orange for Is_Town
                        ['==', ['get', 'market'], true],
                        'green',        // green for market
                        '#004080'        // blue otherwise
                    ],
                    'circle-radius': [
                        'case',
                        ['==', ['get', 'head_port'], true],
                        6,
                        ['==', ['get', 'Is_Town'], 'y'],
                        5,
                        ['==', ['get', 'market'], true],
                        5,
                        4
                    ],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                }
            });

            // Labels for unclustered points, visible only at zoom >= 7
            map.addLayer({
                id: `${sourceName}-labels`,
                type: 'symbol',
                source: sourceName,
                filter: ['all',
                    ['!', ['has', 'point_count']],
                    ['>=', ['zoom'], 7]
                ],
                minzoom: 5,
                layout: {
                    'text-field': ['coalesce', ['get', 'title'], ['get', 'name']],
                    'text-font': [fontName],
                    'text-size': 12,
                    'text-offset': [0, 0.8],
                    'text-anchor': 'top'
                },
                paint: {
                    'text-color': '#000',
                    'text-halo-color': '#fff',
                    'text-halo-width': 1.5,
                    'text-halo-blur': 0.5
                }
            });

            if (londonFeature) {
                londonFeature.properties.title = londonFeature.properties.title.toUpperCase();

                map.addSource('london-point', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: [londonFeature]
                    }
                });

                map.addLayer({
                    id: 'london-point-layer',
                    type: 'symbol',
                    source: 'london-point',
                    layout: {
                        'icon-image': 'crown',
                        'icon-size': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            4, 0.8,
                            5, 1.2
                        ],
                        'icon-allow-overlap': true,
                        'icon-offset': [0, -10.0]
                    }
                });

                map.addLayer({
                    id: `london-label`,
                    type: 'symbol',
                    source: 'london-point',
                    minzoom: 5,
                    layout: {
                        'text-field': ['get', 'title'],
                        'text-font': [fontName],
                        'text-size': 12,
                        'text-offset': [0, 0.7],
                        'text-anchor': 'top'
                    },
                    paint: {
                        'text-color': '#000',
                        'text-halo-color': '#fff',
                        'text-halo-width': 1.5,
                        'text-halo-blur': 0.5
                    }
                });
            }
        });
}


function polygons(url, map, sourceName, attribution, colour = 'red', opacity = 1, outline = false) {

    return fetch(url)
        .then(response => response.json())
        .then(data => {
            map.addSource(sourceName, {
                type: 'geojson',
                data,
                attribution: attribution
            });

            // Polygon layer
            map.addLayer({
                id: sourceName,
                type: 'fill',
                source: sourceName,
                paint: {
                    'fill-color': colour,
                    'fill-opacity': opacity
                }
            });

            // Outline layer
            if (outline) {
                map.addLayer({
                    id: `${sourceName}-outline`,
                    type: 'line',
                    source: sourceName,
                    paint: {
                        'line-color': '#004080',
                        'line-width': 2
                    }
                });
            }
        });
}

function lines(url, map, sourceName, attribution, colour = 'red') {
    let layerMinZoom = sourceName === 'overland-routes' ? 5 : 3;
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            map.addSource(sourceName, {
                type: 'geojson',
                data,
                attribution: attribution
            });

            map.addLayer({
                id: sourceName,
                type: 'line',
                source: sourceName,
                minzoom: layerMinZoom,
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                paint: {
                    'line-color': colour,
                    'line-width': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        5, 1.5,
                        15, 12
                    ],
                    'line-opacity': [
                        'case',
                        ['==', ['get', 'Class'], 'direct_evidence'],
                        0.5,
                        ['==', ['get', 'linetype'], 9],
                        0.3,
                        ['==', ['get', 'linetype'], 2],
                        0.5,
                        ['==', ['get', 'linetype'], 1],
                        0.7,
                        1
                    ]
                }
            });
        });
}

function londonMarker(map) {
    const crownColour = 'rgb(225,192,96)';
    const crownPointColour = 'rgba(255,0,0,1)';
    const crownSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 107.7" width="32" height="32">
          <title>crown-jewel</title>
          <path fill="${crownColour}" stroke="#000" stroke-width="1" d="M21.08,83.82h24a15.89,15.89,0,0,1,4.79-11.49A16.33,16.33,0,0,1,77.72,83.82H101.4l12.49-34.67a6.65,6.65,0,0,0,2.1.3,6.9,6.9,0,1,0-6.9-6.89,6.78,6.78,0,0,0,1.3,4l-7.09,5.9c-10,8.19-16.19,4.39-14.29-8.29l1.1-7.2a4.87,4.87,0,0,0,1.2.1,6.88,6.88,0,1,0-4.3-1.5l-1.69,2.7c-8.4,12.59-14.59,7.79-17-4.69L63.94,13.29A6.79,6.79,0,0,0,68.13,7,7.16,7.16,0,0,0,61,0a6.9,6.9,0,0,0-6.89,6.89,6.75,6.75,0,0,0,5.09,6.6l-2.9,11.59C54,35.67,51,56.84,37.56,38.76l-2.19-3a7,7,0,0,0,2.89-5.6,6.89,6.89,0,1,0-6.89,6.89,7.72,7.72,0,0,0,1.5-.2l.5,4.7c.9,6.39,2,15-5.3,14.59-3.59-.2-5-1.4-7.79-3.4l-7.89-5.6A6.8,6.8,0,0,0,13.79,43a6.9,6.9,0,1,0-6.9,6.89,7,7,0,0,0,2.5-.5L21.08,83.82ZM61,3.1a3.8,3.8,0,1,1-3.8,3.79A3.8,3.8,0,0,1,61,3.1Zm54.75,35.46a4.15,4.15,0,1,1-4.2,4.1,4.14,4.14,0,0,1,4.2-4.1Zm-109,0a4.15,4.15,0,1,1,0,8.29A4.13,4.13,0,0,1,2.7,42.66a4.05,4.05,0,0,1,4.09-4.1ZM31.27,26a4.12,4.12,0,0,1,4.1,4.1,4.15,4.15,0,1,1-8.3,0,4.27,4.27,0,0,1,4.2-4.1Zm59.84,0a4.15,4.15,0,1,1,0,8.3,4.15,4.15,0,0,1,0-8.3Zm-70,67.44H48.25a14.62,14.62,0,0,0,1.6,1.9,16.34,16.34,0,0,0,11.49,4.79,16.77,16.77,0,0,0,11.59-4.79,14.62,14.62,0,0,0,1.6-1.9h27V107.7H21.08V93.41Z"/>
          <path fill="${crownPointColour}" d="M61.34,72.53A11.29,11.29,0,1,1,50.05,83.82,11.28,11.28,0,0,1,61.34,72.53Z"/>
        </svg>
        `;

    const svgBlob = new Blob([crownSVG], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
        if (!map.hasImage('crown')) {
            map.addImage('crown', image, {sdf: false});
        }
        URL.revokeObjectURL(url);
    };
    image.src = url;
}