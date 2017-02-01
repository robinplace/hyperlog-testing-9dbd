const resolve = require ('path').resolve
const webpack = require ('webpack')

const isDevelopment = process.env.NODE_ENV !== 'production'

module.exports = {
	entry: {
		counter: resolve (__dirname, './client/counter'),
	},
	output: {
		path: resolve (__dirname, './static'),
		publicPath: '/',
		filename: 'bundle.[name].js',
	},
	target: 'web',
	module: {
		rules: [
			{
				test: /\.js$/,
				include: [
					resolve (__dirname, './client'),
				],
				use: [ {
					loader: 'babel-loader',
					options: {
						presets: [ 'stage-0', [ 'latest', { modules: false } ], 'react' ],
						plugins: [ 'lodash' ],
					},
				} ],
			},
			{
				test: /\.css$/,
				include: resolve (__dirname, './client'),
				use: [ 'style-loader', 'css-loader' ],
			},
			{
				include: resolve (__dirname, './node_modules/hyperlog'),
				use: 'transform-loader/cacheable?brfs'
			}
		],
	},
	resolve: {
		modules: [
			'node_modules',
			resolve (__dirname, './client'),
		],
		extensions: [ '.js', '.css' ],
	},
	plugins: [
		new webpack.ProvidePlugin ({
			'_': 'lodash',
			'ReactTransitionGroup': 'react-addons-transition-group',
			'c': 'classnames',
			'React': 'react',
		}),
		new webpack.DefinePlugin ({
			'process.env.NODE_ENV': JSON.stringify (process.env.NODE_ENV),
			'process.env.AUTH0_DOMAIN': JSON.stringify (process.env.AUTH0_DOMAIN),
			'process.env.AUTH0_CLIENT_ID': JSON.stringify (process.env.AUTH0_CLIENT_ID)
		}),
		...(isDevelopment ? [] : [
			new webpack.optimize.DedupePlugin (),
			new webpack.optimize.UglifyJsPlugin (),
			new webpack.optimize.AggressiveMergingPlugin (),
		]),
	],
	devtool: isDevelopment ? 'cheap-eval-source-map' : false,
	devServer: {
		host: '0.0.0.0',
		inline: true,
		compress: true,
		contentBase: resolve (__dirname, './static'),
		watchContentBase: true,
		publicPath: '/',
		port: 3001,
		proxy: {
			'/socket': {
				target: { socketPath: process.env.PORT },
				ws: true,
			},
			'!**/bundle.*.js': {
				target: { socketPath: process.env.PORT },
			},
		},
	},
	performance: {
		hints: false,
	},
}
