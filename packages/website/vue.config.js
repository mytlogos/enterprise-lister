const path = require("path");

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
  outputDir: "dist",
  pages: {
    app: {
      entry: "src/main.ts",
      template: "public/index.html",
    },
  },
  configureWebpack: {
    devtool: "source-map",
  },
};
