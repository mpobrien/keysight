var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
	entry:"./sightread2.js",
	output:{
		patch: __dirname,
		filename:"bundle.js"
	},
  resolve:{
    extensions:['','.js','.jsx','.scss', '.less']
  },
	node:{
		fs:"empty",
		child_process:"empty"
	},
	module:{
		loaders: [
			{ test: /\.css$/, loader: "style!css" },
			{ test: /\.scss$/, loader: ExtractTextPlugin.extract('css!sass')},
			{ test: /.jsx?/, loader:'babel-loader', exclude: /node_modules/,
			   query: {
			     presets: ['es2015', 'react']
			   }
			}
		]
	}, 
  plugins: [
    new ExtractTextPlugin('public/style.css', {
      allChunks: true,
    })
  ],
}
