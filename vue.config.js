const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// all builds should be started from project root
const context = process.cwd();
const websiteContext = path.join(context, "src", "website");

module.exports = {
  outputDir: "dist/website",
  pages: {
    app: {
      entry: "src/website/main.ts",
      template: "src/public/index.html",
    },
  },
  configureWebpack: {
    plugins: [
      /* config.plugin("copy") */
      new CopyWebpackPlugin([{
            from: path.join(context, "src", "public"),
            to: path.join(context, "dist", "website"),
            toType: "dir"
        }
      ]),
    ]
  }
}