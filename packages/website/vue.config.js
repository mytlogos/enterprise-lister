const path = require("path");

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
  configureWebpack: {
    devtool: "source-map",
  },

  pwa: {
    workboxOptions: {
      navigateFallback: "/index.html",
      navigateFallbackDenylist: [
        /\.[^.]+$/ // do not serve index.html for assets (anything with file extension)
      ],
    },
  },

  pluginOptions: {
    quasar: {
      importStrategy: 'kebab',
      rtlSupport: true
    }
  },

  transpileDependencies: [
    'quasar'
  ]
};
