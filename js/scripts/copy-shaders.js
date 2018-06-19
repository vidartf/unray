'use strict';

const path = require('path');
const fse = require('fs-extra');

const scriptDir = __dirname;
const baseDir = path.resolve(scriptDir, '..');

const buildDir = path.resolve(baseDir, 'lib', 'glsl');
const shaderDir = path.resolve(baseDir, 'src', 'glsl');

console.log(shaderDir, buildDir)

function copyExampleImagesToDocs() {
    return fse.readdir(shaderDir).then((dirFiles) => {
        return Promise.all(dirFiles.map(filePath => {
            return fse.copy(
                path.resolve(shaderDir, filePath),
                path.resolve(buildDir, filePath)
            );
        })).then(function() {
            console.log(`Copied shaders to lib`);
        });
    });
}


if (require.main === module) {
    // This script copies files after a build
    Promise.all([
        copyExampleImagesToDocs(),
    ]);
}
