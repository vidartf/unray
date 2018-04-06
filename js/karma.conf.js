module.exports = function (config) {
  config.set({
    basePath: '.',
    frameworks: ['mocha', 'karma-typescript'],
    reporters: ['mocha', 'karma-typescript'],
    client: {
      mocha: {
        timeout : 10000, // 10 seconds - upped from 2 seconds
      }
    },
    files: [
      { pattern: "test/**/*.ts" },
      { pattern: "src/**/*.ts" }
    ],
    preprocessors: {
      '**/*.ts': ['karma-typescript']
    },
    browserNoActivityTimeout: 31000, // 31 seconds - upped from 10 seconds
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
    },

    customLaunchers: {
      Travis: {
          base: 'ChromeHeadless',
          flags: ['--no-sandbox']
      }
    },
  });
};
