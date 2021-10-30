/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    verbose: true,
    testPathIgnorePatterns: [
        "/node_modules/",
        "<rootDir>/dist/"
    ]
};

module.exports = config;