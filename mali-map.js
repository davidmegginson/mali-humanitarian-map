
// Namespace
var mali_map = {
};

// Map configuration
mali_map.config = {
    title: "Mali conficts and 3W",
    codLayers: [
        {
            id: "cods",
            group: "base",
            country: "MLI",
            level: "#adm2"
        }
    ],
    layers: [
        {
            id: "ch",
            group: "shaded",
            name: "Cadre harmonisé",
            url: "https://proxy.hxlstandard.org/data/eb10c3.csv",
            unit: "% at risk",
            hashtag: "#indicator+nutrition+at_risk+pct",
            colorMap: [
                [0.0, '#00ff00'],
                [0.5, '#ffff00'],
                [1.0, '#ff0000']
            ]
        },
        {
            id: "acf",
            group: "shaded",
            name: "ACF biomass",
            url: "https://proxy.hxlstandard.org/data/ef1443.csv",
            unit: "% deviation",
            hashtag: "#indicator+deviation_from_mean",
            colorMapType: "absolute",
            colorMap: [
                [0, '#FF0000'],
                [100, '#FFFFFF'],
                [200, '#00FF00']
            ]
        },
        {
            id: "3w",
            group: "shaded",
            name: "Mali 3W",
            url: "https://data.humdata.org/dataset/d7ab89e4-bcb2-4127-be3c-5e8cf804ffd3/resource/b8f708da-e596-456c-b550-f88959970d21/download/mali_3wop_decembre-2017.xls",
            unit: "3W activities"
        },
        {
            id: "acled-heat",
            group: "heat",
            name: "ACLED conflict heat map",
            url: "https://data.humdata.org/dataset/acled-data-for-mali",
            unit: "incidents",
            style: "heat"
        },
        {
            id: "acled-points",
            group: "points",
            name: "ACLED conflict heat map",
            url: "https://data.humdata.org/dataset/acled-data-for-mali",
            unit: "incidents",
            style: "cluster"
        },
    ]
};

// Activate a layer (and deactivate others in the same group)
mali_map.activateLayer = function(group, id) {
    var groupLayers = mali_map.map.getGroupLayers(group);
    groupLayers.forEach((layer) => {
        if (layer.config.id == id) {
            layer.show();
        } else {
            layer.hide();
        }
    });
};

// Set up the map
mali_map.setup = function () {
    mali_map.map = new hxlmaps.Map("map", mali_map.config, (map) => {
        for (let node of document.getElementById("layers").getElementsByTagName("input")) {
            if (node.checked) {
                mali_map.activateLayer(node.name, node.value);
            }
            node.onchange = (event) => {
                var inputNode = event.srcElement;
                mali_map.activateLayer(inputNode.name, inputNode.value);
            };
        }
    });
};

// Set up the map on load
window.onload = mali_map.setup();
