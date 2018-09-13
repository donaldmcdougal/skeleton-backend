const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        server: './src/server.ts'
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            'main.server': path.join(__dirname, 'dist', 'server', 'main.bundle.js')
        }
    },
    target: 'node',
    externals: [nodeExternals()],
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {test: /\.ts$/, loader: 'ts-loader'}
        ]
    },
    plugins: [
        new CopyWebpackPlugin([{ from: '*.jwt', to: '' }, {from : 'server.*', to: ''}, { from: 'config/*.json', to : ''}])
    ]
};
