"use strict";

// Build Float32Array with numbers from 0 to n-1
export
function arange(n) {
    const arr = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
        arr[i] = i;
    }
    return arr;
}

// Two level Object.assign, i.e. override defaults.foo.* with params.foo.* where present
export
function extend2(defaults, params) {
    const p = Object.assign({}, defaults);
    for (let key in params) {
        Object.assign(p[key], params[key]);
    }
    return p;
}

// In place deletion of entries with undefined value
export
function delete_undefined(obj) {
    for (let key in obj) {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    }
    return obj;
}