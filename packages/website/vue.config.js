const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// all builds should be started from package root
// via workspace or directly in folder
const context = process.cwd();

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
    plugins: [
      /* config.plugin("copy") */
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(context, "public"),
            to: path.join(context, "dist"),
            toType: "dir",
          },
        ]
      }),
    ],
  },
};
