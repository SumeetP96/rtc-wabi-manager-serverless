const env = require('esbuild-plugin-env');

module.exports = (serverless) => {
    return {
        external: ['@aws-sdk/client-s3'],
        plugins: [env()],
    };
};
