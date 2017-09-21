module.exports = function (config) {
  config.set({
    basePath: '.',
    frameworks: [
      'mocha',
      'chai',
    ],
    reporters: [
      'mocha',
    ],
    files: [
      'test/index.js'
    ],
    preprocessors: {
      'test/index.js': ['webpack', 'sourcemap']
    },
    webpack: {
      module: {
        rules: [
            { test: /\.glsl$/, loader: 'webpack-glsl-loader' },
        ]
      },
      devtool: 'inline-source-map'
  },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO
  });
};
