// Vercel function. The real code is compiled to dist/ by `npm run build`.
module.exports = require('../dist/serverless').default;
