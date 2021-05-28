const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// all builds should be started from project root
const context = process.cwd();
const websiteContext = path.join(context, "packages", "website");

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
  outputDir: "dist/website",
  pages: {
    app: {
      entry: "packages/website/src/main.ts",
      template: "public/index.html",
    },
  },
  configureWebpack: {
    devtool: "source-map",
    plugins: [
      /* config.plugin("copy") */
      new CopyWebpackPlugin([
        {
          from: path.join(context, "public"),
          to: path.join(context, "dist", "website"),
          toType: "dir",
        },
      ]),
    ],
  },
};
