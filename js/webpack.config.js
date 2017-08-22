const path = require('path');

// Target paths
const static_path = path.resolve(__dirname, '../unray/static');
const dist_path = path.resolve(__dirname, 'dist');


// One definition of version
const version = require('./package.json').version;


// Packages that shouldn't be bundled but loaded at runtime
const externals = ['@jupyter-widgets/base', 'jupyter-datawidgets'];
//const externals = ['@jupyter-widgets/base', 'three', 'jupyter-threejs'];


// Custom webpack rules are generally the same for all webpack bundles, hence
// stored in a separate local variable.
const rules = [
//    { test: /\.js$/, enforce: "pre", loader: 'eslint-loader' },
    { test: /\.glsl$/, loader: 'webpack-glsl-loader' },
];


// Notebook extension
//
// This bundle only contains the part of the JavaScript that is run on
// load of the notebook. This section generally only performs
// some configuration for requirejs, and provides the legacy
// "load_ipython_extension" function which is required for any notebook
// extension.
const extension = {
    entry: './src/extension.js',
    output: {
        filename: 'extension.js',
        path: static_path,
        libraryTarget: 'amd'
    }
};


// Bundle for the notebook containing the custom widget views and models
//
// This bundle contains the implementation for the custom widget views and
// custom widget.
// It must be an amd module
const index = {
    entry: './src/index.js',
    output: {
        filename: 'index.js',
        path: static_path,
        libraryTarget: 'amd'
    },
    devtool: 'source-map',
    module: {
        rules: rules
    },
    externals: externals,
};


// Embeddable unray bundle
//
// This bundle is generally almost identical to the notebook bundle
// containing the custom widget views and models.
//
// The only difference is in the configuration of the webpack public path
// for the static assets.
//
// It will be automatically distributed by unpkg to work with the static
// widget embedder.
//
// The target bundle is always `dist/index.js`, which is the path required
// by the custom widget embedder.
const embed = {
    entry: './src/embed.js',
    output: {
        filename: 'index.js',
        path: dist_path,
        libraryTarget: 'amd',
        publicPath: 'https://unpkg.com/unray@' + version + '/dist/'
    },
    devtool: 'source-map',
    module: {
        rules: rules
    },
    externals: externals,
}


module.exports = [
    extension,
    index,
    embed
];
