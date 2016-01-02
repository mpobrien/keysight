module.exports = {
	entry:"./sightread2.js",
	output:{
		patch: __dirname,
		filename:"bundle.js"
	},
  resolve:{
    extensions:['','.js','.jsx','.scss']
  },
	node:{
		fs:"empty",
		child_process:"empty"
	},
	module:{
		loaders: [
			{ test: /\.css$/, loader: "style!css" },
			{ test: /\.scss$/, loaders: ["style", "css", "sass"] },
			{ test: /.jsx?/, loader:'babel-loader', exclude: /node_modules/,
			   query: {
			     presets: ['es2015', 'react']
			   }
			}
		]
	}
}
