module.exports = {
	entry:"./sightread2.js",
	output:{
		patch: __dirname,
		filename:"bundle.js"
	},
	node:{
		fs:"empty",
		child_process:"empty"
	},
	module:{
		loaders: [
			{ test: /\.css$/, loader: "style!css" },
			{ test: /.jsx?/, loader:'babel-loader', exclude: /node_modules/,
			   query: {
			     presets: ['es2015', 'react']
			   }
			}
		]
	}
}
