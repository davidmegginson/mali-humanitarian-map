
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
        {
            id: "3w",
            group: "shaded",
            name: "Mali 3W",
            url: "https://data.humdata.org/dataset/d7ab89e4-bcb2-4127-be3c-5e8cf804ffd3/resource/b8f708da-e596-456c-b550-f88959970d21/download/mali_3wop_decembre-2017.xls",
            unit: "3W activities"
        }
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
    mali_map.map = new hxlmaps.Map("map", mali_map.config);
    console.log(document.getElementById("layers"));
    for (let node of document.getElementById("layers").getElementsByTagName("input")) {
        node.onchange = (event) => {
            var inputNode = event.srcElement;
            mali_map.activateLayer(inputNode.name, inputNode.value);
        };
    }
};

// Set up the map on load
window.onload = mali_map.setup();
