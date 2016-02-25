var webpack = require('webpack');
options = {
  entry: {
  app: './public/javascripts/entry.js',
},
target: "node",
output: {
  path: './public/javascripts/built',
  filename: 'bundle.js'
},
module: {
 loaders: [
   { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/, query: {presets:['react']} },
 ]
},
plugins: [
  new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': '"production"'
    }
  })
],

}

module.exports = options;
