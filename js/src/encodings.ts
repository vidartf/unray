"use strict";

// Build default encodings for each method
export
function create_default_encodings(): IEncodingMap {
    // Reusable channel defaults
    const cells = {
        field: null,
    };
    const coordinates = {
        field: null,
    };
    const indicators = {
        field: null,
        value: 1,
        lut_field: null,
        space: "I3",
    };
    const density = {
        // x -> [D0, D1] \subset Real
        constant: 1.0,
        field: null,
        space: "P1",
        // [D0, D1] -> [0,1]
        range: "auto",      // Or [x0, x1]
        scale: "linear",    // "identity", "linear", "log", "pow"
        scale_base: "e",    // If scale type is log
        scale_exponent: 2,  // If scale type is pow
        // [0,1] -> density
        lut_field: null,    // Identity if null
    };
    const emission = {
        // x -> [D0, D1] \subset Real
        constant: 1.0,
        field: null,
        space: "P1",
        // [D0, D1] -> [0,1]
        range: "auto",      // Or [x0, x1]
        scale: "linear",    // "identity", "linear", "log", "pow"
        scale_base: "e",    // If scale type is log
        scale_exponent: 2,  // If scale type is pow
        // [0,1] -> color
        lut_field: null,    // [0,1] * color if null
        color: "#ffffff",
    };
    const wireframe = {
        enable: false,
        size: 0.01,
        color: "#000000",
        opacity: 1.0,
    };
    const isovalues = {
        mode: "single", // "single", "linear", "log", "pow"
        value: 0.0,
        num_intervals: 1.0,
        base: 1.0,
        exponent: 1.0,
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
        surface: { cells, coordinates, indicators, wireframe, emission, light } as ISurfaceEncoding,
        isosurface: { cells, coordinates, indicators, wireframe, isovalues, emission, density, light } as IIsoSurfaceEncoding,
        xray: { cells, coordinates, indicators, density, extinction } as IXrayEncoding,
        sum: { cells, coordinates, indicators, emission, exposure } as ISumEncoding,
        min: { cells, coordinates, indicators, emission } as IMinEncoding,
        max: { cells, coordinates, indicators, emission } as IMaxEncoding,
        volume: { cells, coordinates, indicators, density, emission, extinction, exposure } as IVolumeEncoding,
    };

    return default_encodings;
}

export
const default_encodings = create_default_encodings();


// --------------------------------------------------
// Everything below here is encoding type definitions
// --------------------------------------------------

// List of valid field types
export
type FieldType = "P0" | "P1" | "D1";

// List of valid indicator field types
export
type IndicatorFieldType = "I0" | "I1" | "I2" | "I3";

// List of valid scale types
export
type ScaleType = "identity" | "linear" | "log" | "pow";

/**
 * Encoding entry for cells
 */
export
interface ICellsEncodingEntry {
    field: string | null;
}

/**
 * Encoding entry for coordinates
 */
export
interface ICoordinatesEncodingEntry {
    field: string | null;
}

/**
 * Encoding entry for indicators
 */
export
interface IIndicatorsEncodingEntry {
    field: string | null;
    value: number;
    lut_field: string | null;
    space: IndicatorFieldType,
}

/**
 * Encoding entry for density
 */
export
interface IDensityEncodingEntry {
    constant: number;
    field: string | null;
    space: FieldType;
    range: 'auto' | number[];
    scale: ScaleType;
    scale_base: "e" | null;
    scale_exponent: number | null;
    lut_field: string | null;
}

/**
 * Encoding entry for emission
 */
export
interface IEmissionEncodingEntry {
    constant: number;
    field: string | null;
    space: FieldType;
    range: 'auto' | number[];
    scale: ScaleType;
    scale_base: "e" | null;
    scale_exponent: number | null;
    lut_field: string | null;
    color: string;
}

/**
 * Encoding entry for wireframe
 */
export
interface IWireframeEncodingEntry {
    enable: boolean;
    size: number;
    color: string;
    opacity: number;
}

/**
 * Encoding entry for iso-values
 */
export
interface IIsoValuesEncodingEntry {
    mode: "single" | "linear" | "log" | "pow";
    value: number;
    num_intervals: number;
    base: number;
    exponent: number;
}

/**
 * Encoding entry for emission
 */
export
interface ILightEncodingEntry {
    emission_intensity_range: 'auto' | number[];
    // ambient_intensity: 0.0;
    // ambient_color: "#888888"
}

/**
 * Encoding entry for extinction
 */
export
interface IExtinctionEncodingEntry {
    value: number;
}

/**
 * Encoding entry for exposure
 */
export
interface IExposureEncodingEntry {
    value: number;
}


/**
 * Any encoding entry interface type
 */
export
type IEncodingEntry = ICellsEncodingEntry | ICoordinatesEncodingEntry | IIndicatorsEncodingEntry |
     IDensityEncodingEntry | IEmissionEncodingEntry | IWireframeEncodingEntry | IIsoValuesEncodingEntry |
     ILightEncodingEntry | IExtinctionEncodingEntry | IExposureEncodingEntry;

/**
 * Any partial encoding entry interface type
*/
export
type IPartialEncodingEntry = Partial<ICellsEncodingEntry> | Partial<ICoordinatesEncodingEntry> |
    Partial<IIndicatorsEncodingEntry> | Partial<IDensityEncodingEntry> |
    Partial<IEmissionEncodingEntry> | Partial<IWireframeEncodingEntry> |
    Partial<IIsoValuesEncodingEntry> | Partial<ILightEncodingEntry> |
    Partial<IExtinctionEncodingEntry> | Partial<IExposureEncodingEntry>;



/**
 * Base encoding interface for mesh data.
 */
export interface IMeshEncoding {
    cells: ICellsEncodingEntry;
    coordinates: ICoordinatesEncodingEntry;
    indicators?: IIndicatorsEncodingEntry;
    [key: string]: IEncodingEntry | undefined;
}

export interface ISurfaceEntries  {
    wireframe: IWireframeEncodingEntry;
    light: ILightEncodingEntry;
    emission: IEmissionEncodingEntry;
}

export interface IIsoSurfaceEntries {
    wireframe: IWireframeEncodingEntry;
    isovalues: IIsoValuesEncodingEntry;
    emission: IEmissionEncodingEntry;
    density: IDensityEncodingEntry;
    light: ILightEncodingEntry;
}

export interface IXrayEntries {
    density: IDensityEncodingEntry;
    extinction: IExtinctionEncodingEntry;
}

export interface ISumEntries {
    emission: IEmissionEncodingEntry;
    exposure: IExposureEncodingEntry;
}

export interface IMinEntries {
    emission: IEmissionEncodingEntry;
}

export interface IMaxEntries {
    emission: IEmissionEncodingEntry;
}

export interface IVolumeEntries {
    density: IDensityEncodingEntry;
    emission: IEmissionEncodingEntry;
    extinction: IExtinctionEncodingEntry;
    exposure: IExposureEncodingEntry;
}


/**
 * Encoding of a surface
 */
export
type ISurfaceEncoding = IMeshEncoding & ISurfaceEntries;
export
type IPartialSurfaceEncoding = IMeshEncoding & Partial<ISurfaceEntries>;


/**
 * Encoding of an iso-surface
 */
export
type IIsoSurfaceEncoding = IMeshEncoding & IIsoSurfaceEntries;
export
type IPartialIsoSurfaceEncoding = IMeshEncoding & Partial<IIsoSurfaceEntries>;

/**
 * Encoding of an Xray volume
 */
export
type IXrayEncoding = IMeshEncoding & IXrayEntries;
export
type IPartialXrayEncoding = IMeshEncoding & Partial<IXrayEntries>;

/**
 * Encoding of a sum volume
 */
export
type ISumEncoding = IMeshEncoding & ISumEntries;
export
type IPartialSumEncoding = IMeshEncoding & Partial<ISumEntries>;

/**
 * Encoding of a min volume
 */
export
type IMinEncoding = IMeshEncoding & IMinEntries;
export
type IPartialMinEncoding = IMeshEncoding & Partial<IMinEntries>;

/**
 * Encoding of a max volume
 */
export
type IMaxEncoding = IMeshEncoding & IMaxEntries;
export
type IPartialMaxEncoding = IMeshEncoding & Partial<IMaxEntries>;

/**
 * Encoding of a generic volume
 */
export
type IVolumeEncoding = IMeshEncoding & IVolumeEntries;
export
type IPartialVolumeEncoding = IMeshEncoding & Partial<IVolumeEntries>;


/**
 * Any encoding interface type
 */
export
type IEncoding = ISurfaceEncoding | IIsoSurfaceEncoding | IXrayEncoding |
     ISumEncoding | IMinEncoding | IMaxEncoding | IVolumeEncoding;
export
type IPartialEncoding = IPartialSurfaceEncoding | IPartialIsoSurfaceEncoding | IPartialXrayEncoding |
    IPartialSumEncoding | IPartialMinEncoding | IPartialMaxEncoding | IPartialVolumeEncoding;

export
interface IEncodingMap {
    surface: ISurfaceEncoding;
    isosurface: IIsoSurfaceEncoding;
    xray: IXrayEncoding;
    sum: ISumEncoding;
    min: IMinEncoding;
    max: IMaxEncoding;
    volume: IVolumeEncoding;
    [key: string]: IEncoding;
}

export
interface IPartialEncodingMap {
    surface: IPartialSurfaceEncoding;
    isosurface: IPartialIsoSurfaceEncoding;
    xray: IPartialXrayEncoding;
    sum: IPartialSumEncoding;
    min: IPartialMinEncoding;
    max: IPartialMaxEncoding;
    volume: IPartialVolumeEncoding;
    [key: string]: IPartialEncoding;
}
