// map.js

function initMap() {
    if (window._mapInitialized) return;

    const sourceUrlZ8 = `pmtiles://map-resources/osm-coastlines-z8.pmtiles`;
    const sourceUrlZ9 = `pmtiles://map-resources/osm-coastlines-z9.pmtiles`;

    const seaColour = '#0b3b53';
    const landColour = '#849552';

    const style = {
        version: 8,
        glyphs: `map-resources/{fontstack}/{range}.pbf`,
        sources: {
            coastlines: {
                type: 'vector',
                tiles: [
                    'https://raw.githubusercontent.com/docuracy/Historical_Sea_Routing/main/osm-countries-tiles/{z}/{x}/{y}.mvt',
                ],
                minzoom: 0,
                maxzoom: 10,
                tileSize: 512,
                attribution: 'Land: <a target="_blank" href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
            },
            'viabundus_water': {
                type: 'vector',
                tiles: [
                    'https://raw.githubusercontent.com/docuracy/Historical_Sea_Routing/main/viabundus-water-tiles/{z}/{x}/{y}.mvt',
                ],
                minzoom: 0,
                maxzoom: 10,
                tileSize: 512,
                attribution: 'Water c.1500: Holterman/<a target="_blank" href="https://www.landesgeschichte.uni-goettingen.de/handelsstrassen/info.php">Viabundus</a>',
            },
        },
        layers: [
            {
                id: 'sea-background',
                type: 'background',
                paint: {
                    'background-color': seaColour,
                }
            },
            {
                id: 'land-polygons',
                type: 'fill',
                source: 'coastlines',
                'source-layer': 'coastlines',
                paint: {
                    'fill-color': landColour,
                    'fill-opacity': 1
                }
            },
            {
                id: 'viabundus-water',
                type: 'fill',
                source: 'viabundus_water',
                'source-layer': 'viabundus_water',
                paint: {
                    'fill-color': seaColour,
                    'fill-opacity': 1
                },
            },
        ]
    };

    const map = new maplibregl.Map({
        container: 'map',
        style: style,
        hash: true,
        attributionControl: {
            compact: true
        }
    });

    window.londonCoordinates = [-0.0817, 51.5084];

    map.on('style.load', async () => {
        map.setProjection({type: 'globe'});

        londonMarker(map);

        map.fitBounds(
            [[-30.00, 30.00], [32.00, 67.00]],
            {
                padding: 40,
                duration: 3000
            }
        );

        await lines(
            './data/geo/oksanen-navigable-waterways-2019.geojson',
            map,
            'navigable-waterways',
            'Inland Navigation: <a target="_blank" href="https://archaeologydataservice.ac.uk/archives/collections/view/1003427/index.cfm">Oksanen, 2019</a>',
            seaColour
        )

        await lines(
            './data/geo/gadd-ogilby-lea.geojson',
            map,
            'overland-routes',
            'Overland Routes, c.1680: Gadd (unpublished)',
            '#c6a998'
        )

        await clusterPoints(
            './data/geo/viabundus-2-settlements-reduced.geojson',
            map,
            'viabundus',
            '<a target="_blank" href="https://www.landesgeschichte.uni-goettingen.de/handelsstrassen/info.php">Viabundus</a>: Holterman et al.'
        );

        await clusterPoints(
            './data/geo/gadd-index-villaris.geojson',
            map,
            'index-villaris',
            'Index Villaris 1680: <a target="_blank" href="https://github.com/docuracy/IndexVillaris1680">Gadd</a>',
            true
        );

        await clusterPoints(
            './data/geo/gadd-customs-ports.geojson',
            map,
            'customs-ports',
            'Customs Ports 1566: <a target="_blank" href="https://github.com/docuracy/Elizabethan_Coastal_Surveys_1565">Gadd</a>'
        );

        await clusterPoints(
            './data/geo/gadd-landing-places.geojson',
            map,
            'landing-places',
            'Landing Places 1565: <a target="_blank" href="https://github.com/docuracy/Elizabethan_Coastal_Surveys_1565">Gadd</a>'
        );
    });

    map
        .addControl(new maplibregl.NavigationControl({visualizePitch: true}), 'top-right')
        .addControl(new maplibregl.GlobeControl(), 'top-right')
        .addControl(new maplibregl.FullscreenControl(), 'top-right')
        .addControl(new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }), 'top-right')
        .addControl(new maplibregl.ScaleControl({
            maxWidth: 100,
            unit: 'metric'
        }));

    window._mapInitialized = true;
}