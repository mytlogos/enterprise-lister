module.exports = {
  presets: [
    '@vue/app'
  ],
  "plugins": [
    ["prismjs", {
        "languages": ["json"],
        "plugins": ["line-numbers"],
        "theme": "twilight",
        "css": true
    }]
  ]
};
