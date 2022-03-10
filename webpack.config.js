module.exports = {
    entry: './index.js',
    output: {
        filename: './dist/index.js',
        // export to AMD, CommonJS, or window
        libraryTarget: 'umd',
        // the name exported to window
        library: 'heu'
    }
};
