"use strict";

// TODO: Improve and document encoding specifications


// Build default encodings for each method
export
function create_default_encodings() {
    // Reusable channel defaults
    const cells = {
        field: null,
    };
    const coordinates = {
        field: null,
    };
    const indicators = {
        field: null,
        values: [1],
        lut_field: null,
    };
    const density = {
        constant: 1.0,
        field: null,
        space: "P1",
        range: "auto",
        lut_field: null,
        // TODO: Handle linear/log scaled LUTs somehow:
        // lut_space: "linear",
    };
    const emission = {
        constant: 1.0,
        color: "#ffffff",
        field: null,
        space: "P1",
        range: "auto",
        lut_field: null,
        // TODO: Handle linear/log scaled LUTs somehow:
        // lut_space: "linear",
    };
    const wireframe = {
        enable: false,
        size: 0.001,
        color: "#000000",
        opacity: 1.0,
    };
    const isovalues = {
        mode: "single", // "single", "linear", "log", "power", "sweep"
        value: 0.0,
        num_intervals: 0,
        spacing: 1.0,
        period: 3.0,
    };
    const light = {
        emission_intensity_range: [0.5, 1.0],
        // ambient_intensity: 0.0,
        // ambient_color: "#888888"
    };
    const extinction = { value: 1.0 };
    const exposure = { value: 0.0 };

    // Compose method defaults from channels
    const default_encodings = {
        mesh: { cells, coordinates, indicators, wireframe, light },
        surface: { cells, coordinates, indicators, wireframe, emission, light },
        isosurface: { cells, coordinates, wireframe, isovalues, emission, density },
        xray: { cells, coordinates, indicators, density, extinction },
        sum: { cells, coordinates, indicators, emission, exposure },
        min: { cells, coordinates, indicators, emission },
        max: { cells, coordinates, indicators, emission },
        volume: { cells, coordinates, indicators, density, emission, extinction, exposure },
    };

    return default_encodings;
}

export
const default_encodings = create_default_encodings();