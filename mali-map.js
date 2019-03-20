
// Namespace
var mali_map = {
};

// Map configuration
mali_map.config = {
    title: "Mali conficts and 3W",
    codLayers: [
        {
            country: "MLI",
            level: "#adm3"
        }
    ],
    layers: [
        {
            name: "ACLED conflict heat map",
            url: "https://data.humdata.org/dataset/acled-data-for-mali",
            unit: "incidents",
            style: "heat"
        },
        {
            name: "Mali 3W",
            url: "https://data.humdata.org/dataset/d7ab89e4-bcb2-4127-be3c-5e8cf804ffd3/resource/b8f708da-e596-456c-b550-f88959970d21/download/mali_3wop_decembre-2017.xls",
            unit: "3W activities"
        }
    ]
};

// Set up the map
mali_map.setup = function () {
    mali_map.map = new hxlmaps.Map("map", mali_map.config);
};

// Set up the map on load
window.onload = mali_map.setup();
