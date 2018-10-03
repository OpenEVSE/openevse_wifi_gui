const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
const webpack = require('webpack'); //to access built-in plugins
const path = require('path');

var htmlMinify = {
  removeComments: true,
  collapseWhitespace: true,
  conservativeCollapse: true
};

module.exports = {
  mode: 'production',
  entry: {
    home: "./src/home.js",
    wifi_portal: "./src/wifi_portal.js"
  },
  optimization: {
    splitChunks: {}
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  devServer: {
    contentBase: './dist'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader"
        ]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    //new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({
      filename: 'home.html',
      template: './src/home.htm',
      inject: false,
      minify: htmlMinify
    }),
    new HtmlWebpackPlugin({
      filename: 'wifi_portal.html',
      template: './src/wifi_portal.htm',
      inject: false,
      minify: htmlMinify
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ],
  optimization: {
    minimizer: [
      //new UglifyJsPlugin({}),
      //new OptimizeCssAssetsPlugin({})
    ]
  }
};
