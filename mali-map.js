
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
           level: "#country"
       }
   ],
    layers: [
        {
            id: "hrp",
            group: "shaded",
            name: "Mali 2019 HRP",
            url: "https://data.humdata.org/dataset/mali-humanitarian-response-plan",
            unit: "people",
            suffix: "",
            legend: "People targeted for humanitarian assistance, by cercle (2019)",
            hashtag: "#targeted",
            colorMap: [
                [0.0, '#00ff00'],
                [0.5, '#ffff00'],
                [1.0, '#ff0000']
            ]
        },
        {
            id: "ch",
            group: "shaded",
            name: "Cadre harmonisé",
            url: "https://proxy.hxlstandard.org/data/eb10c3.csv",
            unit: "% IPC phase 3-5",
            suffix: "%",
            legend: "Population in IPC phase 3-5, by cercle (latest)",
            hashtag: "#indicator+nutrition+at_risk+pct",
            colorMapType: "absolute",
            colorMap: [
                [0.0, '#00ff00'],
                [12.5, '#ffff00'],
                [25, '#ff0000']
            ]
        },
        {
            id: "mam",
            group: "shaded",
            name: "Moderate Acute Malnutrition (MAM)",
            url: "https://proxy.hxlstandard.org/data/efd37a.csv",
            suffix: "%",
            legend: "% of population with moderate acute malnutrition (2018-09)",
            hashtag: "#indicator+mam+all",
            colorMapType: "absolute",
            colorMap: [
                [0, '#00ff00'],
                [7.5, '#ffff00'],
                [15, '#ff0000']
            ]
        },
        {
            id: "sam",
            group: "shaded",
            name: "Severe Acute Malnutrition (MAM)",
            url: "https://proxy.hxlstandard.org/data/efd37a.csv",
            suffix: "%",
            legend: "% of population with severe acute malnutrition (2018-09)",
            hashtag: "#indicator+sam+all",
            colorMapType: "absolute",
            colorMap: [
                [0, '#00ff00'],
                [2.5, '#ffff00'],
                [5, '#ff0000']
            ]
        },
        {
            id: "dtm",
            group: "shaded",
            name: "IDPs",
            url: "https://proxy.hxlstandard.org/data/d73763/download/mli-dtm-baseline-assessment-topline.csv",
            unit: "IDPs",
            legend: "IDPs surveyed, by cercle (latest)",
            hashtag: "#affected+idps+ind",
            colorMap: [
                [0.0, '#00FF00'],
                [0.5, '#FFFF00'],
                [1.0, '#FF0000']
            ]
        },
        {
            id: "acf",
            group: "shaded",
            name: "ACF biomass",
            url: "https://proxy.hxlstandard.org/data/ef1443/download/acf-biomass.csv",
            unit: "% of 20-year mean biomass",
            legend: "% of 20-year mean biomass, by cercle (2018)",
            suffix: "%",
            hashtag: "#indicator+from_mean",
            colorMapType: "absolute",
            colorMap: [
                [80, '#FF0000'],
                [100, '#FFFFFF'],
                [120, '#00FF00']
            ]
        },
        {
            id: "inform-flood",
            group: "shaded",
            name: "INFORM risk model for the Sahel",
            legend: "",
            url: "https://proxy.hxlstandard.org/data.csv?filter01=select&select-query01-01=indicator%2Bname%3Dphysical+exposure+to+flood&url=https%3A%2F%2Fproxy.hxlstandard.org%2Fdata%2F757e5f.csv",
            unit: "",
            colorMapType: "absolute",
            colorMap: [
                [0.0, '#00FF00'],
                [5.0, '#FFFF00'],
                [10.0, '#FF0000']
            ]
        },
        {
            id: "inform-drought",
            group: "shaded",
            name: "INFORM risk model for the Sahel",
            legend: "",
            url: "https://proxy.hxlstandard.org/data.csv?filter01=select&select-query01-01=indicator%2Bname%3Ddroughts+probability+and+historical+impact&url=https%3A%2F%2Fproxy.hxlstandard.org%2Fdata%2F757e5f.csv",
            unit: "",
            colorMapType: "absolute",
            colorMap: [
                [0.0, '#00FF00'],
                [5.0, '#FFFF00'],
                [10.0, '#FF0000']
            ]
        },
        {
            id: "inform-natural",
            group: "shaded",
            name: "INFORM risk model for the Sahel",
            legend: "",
            url: "https://proxy.hxlstandard.org/data.csv?filter01=select&select-query01-01=indicator%2Bname%3Dnatural&url=https%3A%2F%2Fproxy.hxlstandard.org%2Fdata%2F757e5f.csv",
            unit: "",
            colorMapType: "absolute",
            colorMap: [
                [0.0, '#00FF00'],
                [5.0, '#FFFF00'],
                [10.0, '#FF0000']
            ]
        },
        {
            id: "acled-heat",
            group: "heat",
            name: "ACLED conflict heat map",
            legend: "Security incidents since January 2018",
            url: "https://data.humdata.org/dataset/acled-data-for-mali",
            unit: "incidents",
            style: "heat"
        },
        {
            id: "acled-points",
            group: "points",
            legend: "Security incidents since January 2018",
            name: "ACLED conflict heat map",
            url: "https://data.humdata.org/dataset/acled-data-for-mali",
            unit: "incidents",
            style: "cluster"
        },
    ]
};

// Activate a layer (and deactivate others in the same group)
mali_map.activateLayer = function(group, id) {
    if (group == "tiles") {
        if (id == "osm") {
            mali_map.map.showOSM();
        } else {
            mali_map.map.hideOSM();
        }
    } else {
        var groupLayers = mali_map.map.getGroupLayers(group);
        groupLayers.forEach((layer) => {
            if (layer.config.id == id) {
                layer.show();
            } else {
                layer.hide();
            }
        });
    }
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
