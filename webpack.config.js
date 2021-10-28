const webpack = require("webpack");
const JsonValidateWebpack = require("./wp-plugin");
const path = require("path");

module.exports = {
    entry: './tests/index.ts',
    mode: "development",
    devtool: "source-map",
    plugins: [
        new JsonValidateWebpack.default(),
        new webpack.CleanPlugin()
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,

                use: [
                    "ts-loader"
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            "rutypi": path.join(__dirname, "src", "index.ts")
        }
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
};