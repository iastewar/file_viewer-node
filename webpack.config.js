var webpack = require('webpack');
options = {
  entry: {
  app: ['webpack/hot/dev-server', './public/javascripts/entry.js'],
},
target: "node",
output: {
  path: './public/javascripts/built',
  filename: 'bundle.js',
  publicPath: 'http://localhost:8080/built/'
},
devServer: {
  contentBase: './public',
  publicPath: 'http://localhost:8080/built/'
},
module: {
 loaders: [
   { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/, query: {presets:['react']} },
 ]
},
 plugins: [
   new webpack.DefinePlugin({
     'process.env': {
       'NODE_ENV': '"development"'
     }
   }),
   new webpack.HotModuleReplacementPlugin()
 ]
}

module.exports = options;
