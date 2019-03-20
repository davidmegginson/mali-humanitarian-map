/**
 * Set up an object to hold the namespace.
 * Everything in this module is under the hxlmaps namespace.
 * @global
 * @namespace
 */
var hxlmaps;
if (typeof(hxlmaps) == 'undefined') {
    hxlmaps = {};
}



////////////////////////////////////////////////////////////////////////
// hxlmaps.Map class
////////////////////////////////////////////////////////////////////////

/**
 * Constructor
 * @param {string} mapId - The HTML identifier of the element that will hold the map.
 * @param {Object} mapConfig - A JSON-style configuration for the map.
 */
hxlmaps.Map = function(mapId, mapConfig) {

    // check that the target element for the map exists
    // if not, justifies an alert
    this.mapNode = document.getElementById(mapId);
    if (!this.mapNode) {
        alert("Internal error: map element not found #" + mapId);
        console.error("Map element note found", mapId);
        return;
    }

    // create the loading spinner for later use
    this.spinner = new Spinner();

    // layer group holding CODs
    this.codLayerGroup = null;

    // the hxlmaps.Layer objects (not Leaflet layers)
    this.layers = [];

    // Set up the map
    if (mapConfig) {
        // if the user supplied a configuration file, set up the map

        var promises = [];

        // the Leaflet map object
        this.map = L.map(mapId, {maxZoom: 18}).setView([0, 0], 6);

        this.spin(true);

        // load each tile layer
        this.tileLayers = {};
        hxlmaps.tileInfo.forEach(tileConfig => {
            var tileLayer = undefined;
            if (tileConfig.url) {
               tileLayer =  L.tileLayer(tileConfig.url, tileConfig.properties);
            } else {
                tileLayer = L.layerGroup();
            }
            this.tileLayers[tileConfig.name] = tileLayer;
        });
        this.osmLayer = this.tileLayers[hxlmaps.tileInfo[0].name];

        // load the CODs base layers
        if (mapConfig.codLayers) {
            this.codLayerGroup = L.layerGroup({
                'pane': 'tilePane'
            });
            mapConfig.codLayers.forEach(codConfig => {
                var promise = hxlmaps.data.loadItosLevel(codConfig.country, codConfig.level).then(
                    json => {
                        this.codLayerGroup.addLayer(L.geoJSON(json, {
                            style: () => {
                                return {
                                    color: "#888888",
                                    weight: 1
                                };
                            },
                            pane: 'tilePane'
                        }));
                    },
                    error => {
                        console.error("Failed to load COD", error, codConfig);
                        // still need to return a resolved promise, so that
                        // other layers can load
                        return Promise.resolve();
                    }
                );
                promises.push(promise);
            });
        }

        // load each HXL-based layer
        if (mapConfig.layers) {
            mapConfig.layers.forEach(layerConfig => {
                var layer = new hxlmaps.Layer(this.map, layerConfig);
                var promise = layer.load().then(
                    () => {
                        if (layer.bounds) {
                            this.extendBounds(layer.bounds);
                        }
                        this.map.addLayer(layer.leafletLayer);
                        this.layers.push(layer);
                    },
                    error => {
                        console.error(error, layer);
                        // still need to return a resolved promise, so that
                        // other layers can load
                        return Promise.resolve();
                    }
                );
                promises.push(promise);
            });
        }

        // this runs only after all layers are loaded
        Promise.all(promises).then(() => {
            this.spin(false);
            if (this.layers.length == 0) {
                console.error("No layers defined");
            }

            // Show the map in bounds
            this.snapToBounds();

            // Set up base layers
            var baseLayers = {};
            if (this.codLayerGroup) {
                baseLayers['CODs'] = this.codLayerGroup;
                this.codLayerGroup.addTo(this.map);
            }
            if (this.osmLayer) {
                baseLayers['OpenStreetMap'] = this.osmLayer;
                if (!this.codLayerGroup) {
                    this.osmLayer.addTo(this.map);
                }
            }
            baseLayers['None'] = L.layerGroup();
            
            // Add a layer selector
            overlays = {}
            this.layers.forEach(layer => {
                overlays[layer.config.name] = layer.leafletLayer;
            });

            hxlmaps.controls.logControl().addTo(this.map);

            L.control.layers(baseLayers, overlays, {
                sort: true,
                autoZIndex: true
            }).addTo(this.map);
        });

    } else {
        // no config supplied
        alert("Internal error: no map configuration supplied");
        console.error("No map configuration supplied");
    }
};

/**
 * Find all layers in a group.
 */
hxlmaps.Map.prototype.getGroupLayers = function(group) {
    var groupLayers = [];
    this.layers.forEach((layer) => {
        if (layer.config.group == group) {
            groupLayers.push(layer);
        }
    });
    return groupLayers;
};


/**
 * Show or hide a loading spinner
 * @param {boolean} spinStatus - true to start spinning; false to stop.
 */
hxlmaps.Map.prototype.spin = function (spinStatus) {
    if (spinStatus) {
        this.spinner.spin(this.mapNode);
    } else {
        this.spinner.stop();
    }
};


/**
 * Extend the bounding rectangle of the map, creating if necessary
 * @param {array} - list of lat/lon pairs to add to the bounds.
 */
hxlmaps.Map.prototype.extendBounds = function (points) {
    if (this.bounds) {
        this.bounds.extend(points);
    } else {
        this.bounds = L.latLngBounds(points);
    }
};


/**
 * Snap the map to its current bounding rectangle.
 */
hxlmaps.Map.prototype.snapToBounds = function () {
    if (this.bounds) {
        this.map.fitBounds(this.bounds);
    } else {
        alert("No map data loaded");
        console.error("No bounds to snap to");
    }
};



////////////////////////////////////////////////////////////////////////
// hxlmaps.HXLLayer class
////////////////////////////////////////////////////////////////////////

/**
 * Constructor
 * @param {Leaflet.map} map - the Leaflet map object.
 * @param {Object} layerConfig - the layer configuration information.
 */
hxlmaps.Layer = function(map, layerConfig) {
    this.map = map;
    this.config = layerConfig;
};

hxlmaps.Layer.prototype.show = function () {
    if (this.leafletLayer && this.map) {
        this.leafletLayer.addTo(this.map);
    }
};

hxlmaps.Layer.prototype.hide = function () {
    if (this.leafletLayer && this.map) {
        this.leafletLayer.removeFrom(this.map);
    }
};

/**
 * Set up the layer so that it's ready to display on a map.
 * @returns a promise that resolves when the layer is loaded into the map
 */
hxlmaps.Layer.prototype.load = function () {

    this.leafletLayer = L.layerGroup();

    if (this.config.type == "alternatives") {
        var promise = this.loadAlternatives();
        return promise.then(() => {
            if (this.legend && this.leafletLayer) {
                this.leafletLayer.on('add', ev => this.legend.addTo(this.map));
                this.leafletLayer.on('remove', ev => this.legend.remove());
            }
        });
    } if (this.config.url) {
        return hxlmaps.data.loadHXL(this.config.url).then((source) => {
            var promise;
            this.source = source;
            this.config = hxlmaps.expandLayerConfig(this.config, this.source);
            
            // return the appropriate Leaflet loading promise
            if (this.config.type == "points") {
                promise = this.loadPoints();
            } else if (this.config.type == "areas") {
                promise = this.loadAreas();
            } else {
                return Promise.reject("Bad layer type " + this.config.type);
            }
            return promise.then(() => {
                if (this.legend && this.leafletLayer) {
                    this.leafletLayer.on('add', ev => this.legend.addTo(this.map));
                    this.leafletLayer.on('remove', ev => this.legend.remove());
                }
            });
        });
    } else {
        return Promise.reject("No HXL url for data layer: " + this.config.name);
    }
};


/**
 * Continue setup for an alternatives layer.
 * @returns a promise that resolves when all layers in the group are loaded
 */
hxlmaps.Layer.prototype.loadAlternatives = function () {
    this.layers = [];
    if (!this.config.layers) {
        return Promise.reject("No alternative layers specified");
    } else {
        var promises = [];
        this.config.layers.forEach((layerConfig) => {
            console.log(layerConfig);
            var layer = new hxlmaps.Layer(this.map, layerConfig);
            var promise = layer.load().then(
                () => {
                    if (layer.bounds) {
                        this.extendBounds(layer.bounds);
                    }
                    this.leafletLayer.addLayer(layer.leafletLayer);
                    //this.map.addLayer(layer.leafletLayer);
                    this.layers.push(layer);
                },
                error => {
                    console.error(error, layer);
                    // still need to return a resolved promise, so that
                    // other layers can load
                    return Promise.resolve();
                }
            );
            promises.push(promise);
        });
        return Promise.all(promises);
    }
};


/**
 * Continue setup for a points layer.
 * @returns a promise that resolves when the points are loaded into the map
 */
hxlmaps.Layer.prototype.loadPoints = function () {
    var layerGroup;
    var points = [];

    if (this.config.style == 'heat') {
        return this.loadHeat();
    } else if (this.config.style == 'cluster') {
        layerGroup = L.markerClusterGroup();
        layerGroup.addTo(this.leafletLayer);
    } else {
        layerGroup = this.leafletLayer;
    }

    this.source.forEach(row => {
        var lat = row.get("#geo+lat");
        var lon = row.get("#geo+lon");
        if (!lat || !lon) {
            return;
        }

        points.push([lat, lon]);
        
        var marker = L.marker([lat, lon]);

        marker.addTo(layerGroup);

        // set up labels
        var label = "<table>";
        for (var i = 0; i < row.values.length; i++) {
            if (row.columns[i]) {
                var name = row.columns[i].header;
                var value = row.values[i];
                if (!name) {
                    name = row.columns[i].displayTag;
                }
                if (name && (value != "")) {
                    label += "<tr><th>" + hxlmaps.esc(name) + "</th><td>" + hxlmaps.esc(row.values[i]) + "</td></tr>";
                }
                marker.bindPopup(label);
            }
        }
        label += "</table>";
        marker.bindPopup(label);

    });

    this.legend = hxlmaps.controls.legendControl({
        layerConfig: this.config,
    });

    this.extendBounds(points);

    return Promise.resolve();
};


/**
 * Load as a heatmap
 * @returns a promise (already resolved)
 */
hxlmaps.Layer.prototype.loadHeat = function () {
    var points = [];

    this.source.forEach(row => {
        var lat = row.get("#geo+lat");
        var lon = row.get("#geo+lon");
        if (lat && lon) {
            points.push([lat, lon]);
        } else {
            console.info("No lat/lon in row");
        }
    });

    this.extendBounds(points);

    L.heatLayer(points, {
        radius: 15,
        minOpacity: 0.4
    }).addTo(this.leafletLayer);

    this.legend = hxlmaps.controls.legendControl({
        layerConfig: this.config,
    });
    
    return Promise.resolve(); // empty promise (resolves instantly)
};


/**
 * Continue setup for an areas layer.
 * @returns a promise that resolves when the areas are loaded into the map
 */
hxlmaps.Layer.prototype.loadAreas = function () {

    this.colorMap = hxlmaps.parseColorMap(this.config.colorMap);

    this.adminInfo = hxlmaps.data.itosAdminInfo[this.config.adminLevel];

    // aggregate the data (count and sum; we'll choose later)
    this.source = this.source.count(
        [this.config.adminLevel + "+name", this.config.adminLevel + "+code"],
        this.config.hashtag
    );

    // get the min/max values
    if (this.config.aggregate == "sum") {
        this.minValue = 0 + this.source.getMin("#*+sum");
        this.maxValue = 0 + this.source.getMax("#*+sum");
    } else {
        this.minValue = 0 + this.source.getMin("#meta+count");
        this.maxValue = 0 + this.source.getMax('#meta+count');
    }

    this.hxlPcodeMap = {};
    this.source.forEach(row => {
        var pcode = row.get('#*+code');
        if (pcode) {
            pcode = pcode.toUpperCase();
            this.hxlPcodeMap[pcode] = row;
        } else {
            console.info("No p-code in row", row);
        }
    });

    this.setCountries();

    return this.loadGeoJSON().then(() => {
        for (var key in this.countryMap) {
            var entry = this.countryMap[key];
            if (entry.geojson) {
                entry.leafletLayer = L.geoJSON(entry.geojson, {
                    onEachFeature: (feature, layer) => { this.addAreaUI(feature, layer); },
                    style: (feature) => { return this.makeAreaStyle(feature); }
                });
                this.extendBounds(entry.leafletLayer.getBounds());
                this.leafletLayer.addLayer(entry.leafletLayer);
            }
        }
        // add a colour legend for the layer
        this.legend = hxlmaps.controls.legendControl({
            layerConfig: this.config,
            min: this.minValue,
            max: this.maxValue
        });

    });

};


/**
 * Load GeoJSON from iTOS for all required countries.
 * @returns a promise that resolves when the GeoJSON is loaded into the map.
 */
hxlmaps.Layer.prototype.loadGeoJSON = function () {
    var countries = Object.keys(this.countryMap);
    var promises = []
    countries.forEach((countryCode) => {
        var promise = hxlmaps.data.loadItosLevel(countryCode, this.config.adminLevel);
        promises.push(promise.then((geojson) => {
            this.countryMap[countryCode]["geojson"] = geojson;
        }));
        promise.catch((error) => {
            // mustn't prevent the load completely
            console.error(error, countryCode, this.config.adminLevel);
            return Promise.resolve();
        });
    });
    return Promise.all(promises); // return a promise that won't complete until all others are done
};


/**
 * Figure out what countries we need to load from iTOS.
 */
hxlmaps.Layer.prototype.setCountries = function () {
    this.countryMap = {};
    this.source.rows.forEach((row) => {
        var countryCode = row.get("#country+code");
        if (countryCode) {
            this.countryMap[countryCode] = {};
        } else {
            var pcode = row.get(this.config.adminLevel + "+code");
            if (!pcode) {
                console.info("No Pcode in row", row);
            } else {
                var countryCode = hxlmaps.data.getPcodeCountry(pcode);
                if (countryCode) {
                    this.countryMap[countryCode] = {};
                } else {
                    console.error("Cannot guess country for P-code", pcode);
                }
            }
        }
    });
};


/**
 * Extend this layer's bounds as needed.
 */
hxlmaps.Layer.prototype.extendBounds = function (geo) {
    if (this.bounds) {
        this.bounds.extend(geo);
    } else {
        this.bounds = L.latLngBounds(geo);
    }
};


/**
 * Add a popup to a GeoJSON feature layer
 */
hxlmaps.Layer.prototype.addAreaUI = function (feature, layer) {
    var pcode = feature.properties[this.adminInfo.property];
    if (pcode) {
        var row = hxlmaps.data.fuzzyPcodeLookup(pcode, this.hxlPcodeMap);
        if (row) {
            var name = row.get('#*+name');
            if (this.config.aggregate == "sum") {
                var count = row.get("#*+sum");
            } else {
                var count = row.get('#meta+count');
            }
            var unit = this.config.unit;
            if (!unit) {
                unit = "";
            }
            var text = name + ': ' + hxlmaps.numfmt(count) + ' ' + unit;
        } else {
            var text = name = '(no data available)';
        }
        layer.bindTooltip(hxlmaps.esc(text));
    }
};


/**
 * Create a style for an area.
 * Attributes will be in feature.properties
 * @param feature: a GeoJSON feature
 * @return: an object specifying Leaflet styles
 */
hxlmaps.Layer.prototype.makeAreaStyle = function (feature) {

    // figure out the weighting of this area, and calculate a color
    var pcode = feature.properties[this.adminInfo.property];
    if (pcode) {
        var row = hxlmaps.data.fuzzyPcodeLookup(pcode, this.hxlPcodeMap);
        if (row) {
            if (this.config.aggregate == "sum") {
                var count = 0 + row.get("#*+sum");
            } else {
                var count = 0 + row.get('#meta+count');
            }
            var percentage = count / this.maxValue;
            var color = hxlmaps.genColor(percentage, this.colorMap);
            return {
                stroke: false, // FIXME take from config
                color: color
            };
        } else {
            return {
                stroke: false, // FIXME take from config
                color: "rgb(128, 128, 128)",
                opacity: 0.5 // FIXME take from config
            };
        }
    } else {
        console.info("Feature has no pcode", this.adminInfo.property, feature);
        return {
            stroke: false
        };
    }

};



////////////////////////////////////////////////////////////////////////
// HXL heuristics (to guess missing config values
////////////////////////////////////////////////////////////////////////

/**
 * Administrative levels we expect to find (no attributes)
 */
hxlmaps.adminPatterns = ["#adm5", "#adm4", "#adm3", "#adm2", "#adm1", "#country"];

hxlmaps.aggregateTagPatterns = ["#reached", "#targeted", "#inneed", "#affected", "#population", "#value", "#*+num"],


/**
 * Fill in a layer config as needed.
 */
hxlmaps.expandLayerConfig = function(config, source) {

    if (!config.type) {
        config.type = hxlmaps.guessTypeFromHXL(source);
    }

    if (config.type == 'areas') {
        if (!config.adminLevel) {
            config.adminLevel = hxlmaps.guessAdminLevelFromHXL(source);
        }
        if (!config.colorMap) {
            config.colorMap = [
                [0.0, '#80d0c7'],
                [1.0, '#13547a']
            ];
        }
        if (config.aggregate != "count")  {
            var column = hxlmaps.guessAggregateColumnFromHXL(source, config.hashtag);
            if (column) {
                config.aggregate = "sum";
                if (!config.hashtag) {
                    config.hashtag = column.displayTag + '!';
                }
                if (!config.legend) {
                    if (column.header) {
                        config.legend = column.header;
                    } else {
                        config.legend = column.displayTag;
                    }
                }
            } else {
                config.aggregate = "count";
            }
        }
        if (config.aggregate == 'count' && !config.legend) {
            var unit = config.unit || "rows";
            config.legend = unit[0].toUpperCase() + unit.slice(1);
        }
    } else if (config.type == 'points') {
        if (!config.style) {
            config.style = hxlmaps.guessPointsStyleFromHXL(source);
        }
        if (!config.legend) {
            if (config.unit) {
                config.legend = config.unit[0].toUpperCase() + config.unit.slice(1);
            } else if (config.name) {
                config.legend = config.name;
            } else {
                config.legend = "Locations";
            }
        }
    }

    return config;
};


/**
 * Guess the type, if needed.
 */
hxlmaps.guessTypeFromHXL = function (source) {
    var columns = source.columns;
    if (hxl.matchList("#geo+lat", columns) && hxl.matchList("#geo+lon", columns)) {
        return 'points';
    } else {
        var patterns = hxlmaps.adminPatterns;
        for (var i = 0; i < hxlmaps.adminPatterns.length; i++) {
            if (hxl.matchList(hxlmaps.adminPatterns[i], columns)) {
                return 'areas';
            }
        }
    }
    console.error("Cannot guess HXL layer type from hashtags");
    return null;
};


/**
 * Guess the admin level, if needed.
 */
hxlmaps.guessAdminLevelFromHXL = function(source) {
    var columns = source.columns;
    for (var i = 0; i < hxlmaps.adminPatterns.length; i++) {
        var pattern = hxlmaps.adminPatterns[i];
        if (hxl.matchList(pattern + "+code", columns)) {
            return pattern;
        }
    }
    console.error("No geocodes found in HXL");
    return null;
};


/**
 * Guess the style for a points layer, if needed
 * 0..100 rows: individual markers
 * 101..1000 rows: cluster markers
 * 1001+: heat map
 */
hxlmaps.guessPointsStyleFromHXL = function(source) {
    var rowCount = source.rawData.length;
    if (rowCount > 1000) {
        return 'heat';
    } else if (rowCount > 100) {
        return 'cluster';
    } else {
        return 'marker';
    }
};


/**
 * Guess the aggregate hashtag, if needed.
 */
hxlmaps.guessAggregateColumnFromHXL = function(source, hashtag) {

    function findColumn(patterns, source) {
        for (var i = 0; i < patterns.length; i++) {
            var pattern = hxl.classes.TagPattern.parse(patterns[i]);
            for (var j = 0; j < source.columns.length; j++) {
                var column = source.columns[j];
                if (pattern.match(column)) {
                    return column;
                }
            }
        }
        return null;
    }
    
    if (hashtag) {
        var column = findColumn([hashtag], source);
    } else {
        var column = findColumn(hxlmaps.aggregateTagPatterns, source);
    }

    if (column) {
        return column;
    } else {
        if (hashtag) {
            console.error("No matching aggregation column", hashtag);
        }
        return null;
    }
};


/**
 * Parse a color map into a more verbose format.
 * Will optionally convert each entry from the succinct version to the verbose version.
 * Also sorts the map for good measure.
 * @param {object} map - the colour map to process
 * @returns - a verbose color map for internal use
 */
hxlmaps.parseColorMap = function(map) {
    for (var i = 0; i < map.length; i++) {
        var entry = map[i];
        if (Array.isArray(entry)) {
            if (entry.length != 2) {
                console.error("Malformed colour map entry", entry);
                break;
            }
            result = entry[1].trim().toUpperCase().match(/^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/);
            if (result) {
                map[i] = {
                    percentage: entry[0],
                    color: {
                        r: parseInt("0x" + result[1]),
                        g: parseInt("0x" + result[2]),
                        b: parseInt("0x" + result[3]),
                    }
                };
            } else {
                console.error("Bad colour specification", entry[1]);
            }
        }
    }
    return map.sort((a, b) => a.percentage - b.percentage);
};



////////////////////////////////////////////////////////////////////////
// Static variables and functions
////////////////////////////////////////////////////////////////////////

/**
 * Escape HTML (why isn't this a standard Javascript function?)
 */
hxlmaps.esc = function(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};


/**
 * Quick create an HTML element with attributes
 * @param name the attribute name
 * @param atts (optional) an object of attribute names and values
 * @param content (optional) content to load into the element
 * @param isHTML (optional) if true, treat content as HTML
 * @returns a DOM element node
 */
hxlmaps.el = function(name, atts, content, isHTML) {
    var node = document.createElement(name);
    if (atts) {
        for (var name in atts) {
            node.setAttribute(name, atts[name]);
        }
    }
    if (content) {
        if (isHTML) {
            node.innerHTML = content;
        } else {
            node.textContent = content;
        }
    }
    return node;
};


/**
 * Generate a colour from a gradiant using a colour map.
 * Adapted from http://stackoverflow.com/posts/7128796/revisions
 * @param percentage: a percentage value from 0.0 to 0.1
 * @param colorMap: the colour map to interpolate
 * @param alpha: (optional) an alpha value from 0.0 to 1.0
 * @returns: a colour specification in rgb or rgba format
 */
hxlmaps.genColor = function(percentage, colorMap, alpha) {
    for (var i = 1; i < colorMap.length - 1; i++) {
        if (percentage < colorMap[i].percentage) {
            break;
        }
    }
    var lower = colorMap[i - 1];
    var upper = colorMap[i];
    var range = upper.percentage - lower.percentage;
    var rangePercentage = (percentage - lower.percentage) / range;
    var percentageLower = 1 - rangePercentage;
    var percentageUpper = rangePercentage;
    var color = {
        r: Math.floor(lower.color.r * percentageLower + upper.color.r * percentageUpper),
        g: Math.floor(lower.color.g * percentageLower + upper.color.g * percentageUpper),
        b: Math.floor(lower.color.b * percentageLower + upper.color.b * percentageUpper)
    };
    if (alpha) {
        return 'rgba(' + [color.r, color.g, color.b, alpha].join(',') + ')';
    } else {
        return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
    }
}


/**
 * Format a number in the default locale
 */
hxlmaps.numfmt = function (n) {
    return new Intl.NumberFormat().format(n);
};



////////////////////////////////////////////////////////////////////////
// Custom controls
////////////////////////////////////////////////////////////////////////

/**
 * Namespace for custom controls
 */
hxlmaps.controls = {};

/**
 * Control to show log information
 */
hxlmaps.controls.LogControl = L.Control.extend({
    options: {
        position: 'bottomleft'
    },
    onAdd: function (map) {
        var node = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        node.style.backgroundColor = 'white';
        node.style.width = '30px';
        node.style.height = '30px';
        node.onclick = () => {
            alert("Logs");
            console.log('buttonClicked');
        };
        node.textContent = "⚠️";
        return node;
    }
});


/**
 * Constructor function for LogControl
 */
hxlmaps.controls.logControl = function(options) {
    return new hxlmaps.controls.LogControl(options);
};

/**
 * Control to show a map legend
 */
hxlmaps.controls.LegendControl = L.Control.extend({
    options: {
        position: 'bottomright',
        layerConfig: {},
        min: 0,
        max: 1
    },
    onAdd: function (map) {
        var node = hxlmaps.el('div', {class: 'info legend map-legend'});

        var type = this.options.layerConfig.type;
        var style = this.options.layerConfig.style;
        if (type == "areas") {
            // show what's being counted
            node.appendChild(hxlmaps.el('div', {class: 'unit'}, this.options.layerConfig.legend));

            // assume choropleth for now

            // set the transparency to match the map
            var alpha = this.options.layerConfig.alpha;
            if (!alpha) {
                alpha = 0.5; // FIXME take from config
            }

            // generate a gradient from 0-100% in 5% steps
            for (var percentage = 0; percentage <= 1.0; percentage += 0.05) {
                var color = hxlmaps.genColor(percentage, this.options.layerConfig.colorMap, alpha);
                node.appendChild(hxlmaps.el(
                    'span',
                    {
                        class: 'color',
                        style: 'background:' + color
                    },
                    "&nbsp",
                    true
                ));
            }

            // add the minimum and maximum absolute values
            node.appendChild(hxlmaps.el('br')); // FIXME: blech
            node.appendChild(hxlmaps.el('div', {class: 'min'}, hxlmaps.numfmt(this.options.min)));
            node.appendChild(hxlmaps.el('div', {class: 'max'}, hxlmaps.numfmt(this.options.max)));
        }

        else if (type == "points") {
            console.log(style);
            switch (style) {
            case 'heat':
                var iconUrl = "lib/hxlmaps/img/heatmap.png";
                break;
            default:
                var iconUrl = "lib/hxlmaps/img/marker.png";
                break;
            }
            var container = node.appendChild(hxlmaps.el('div', { class: "sidebyside" }));
            container.appendChild(hxlmaps.el('img', {
                src: iconUrl,
                class: "icon"
            }));
            container.appendChild(hxlmaps.el('span', {class: 'unit'}, this.options.layerConfig.legend));
        }
        
        return node;
    }
});

/**
 * Constructor function for LegendControl
 */
hxlmaps.controls.legendControl = function (options) {
    return new hxlmaps.controls.LegendControl(options);
};



////////////////////////////////////////////////////////////////////////
// Static data
////////////////////////////////////////////////////////////////////////

/**
 * Tile data
 */
hxlmaps.tileInfo = [
    {
        name: "OpenStreetMap",
        url: 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
        properties: {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets'
        }
    },
    {
        name: "None"
    }
];

