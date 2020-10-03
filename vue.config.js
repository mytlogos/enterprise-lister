const requestPromise = require("request-promise-native");

const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// all builds should be started from project root
const context = process.cwd();
const websiteContext = path.join(context, "website");

module.exports = {
  outputDir: 'website/dist',
  pages: {
    app: {
      entry: 'website/src/main.ts',
      template: 'website/public/index.html',
    },
  },
  configureWebpack: {
    plugins: [
      /* config.plugin('copy') */
      new CopyWebpackPlugin([{
            from: path.join(websiteContext, 'public'),
            to: path.join(websiteContext, 'dist'),
            toType: 'dir'
        }
      ]),
    ]
  }
}