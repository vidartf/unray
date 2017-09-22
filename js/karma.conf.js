module.exports = function (config) {
  config.set({
    basePath: '.',
    frameworks: [
      'mocha',
      'karma-typescript',
    ],
    reporters: [
      'mocha',
      'karma-typescript',
    ],
    files: [
      { pattern: "test/**/*.ts" },
      { pattern: "src/**/*.ts" }
    ],
    preprocessors: {
      '**/*.ts': ['karma-typescript']
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,

    karmaTypescriptConfig: {
      tsconfig: 'test/tsconfig.json',
      reports: {
        "text-summary": "",
        "html": "coverage",
        "lcovonly": {
          "directory": "coverage",
          "filename": "coverage.lcov"
        }
      }
    }
  });
};
