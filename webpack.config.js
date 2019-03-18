const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const MergeIntoSingleFilePlugin = require("webpack-merge-and-include-globally");
const webpack = require("webpack"); //to access built-in plugins
const path = require("path");
const UglifyJS = require("uglify-js");
const babel = require("@babel/core");

var htmlMinify = {
  removeComments: true,
  collapseWhitespace: true,
  conservativeCollapse: true
};

module.exports = {
  mode: "production",
  entry: {
    assets: "./src/assets.js"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },
  devServer: {
    contentBase: "./dist"
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
            loader: "file-loader",
            options: {
              name: "[name].[ext]"
            }
          }
        ]
      }
    ]
  },
  plugins: [
    //new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({
      filename: "home.html",
      template: "./src/home.htm",
      inject: false,
      minify: htmlMinify
    }),
    new HtmlWebpackPlugin({
      filename: "wifi_portal.html",
      template: "./src/wifi_portal.htm",
      inject: false,
      minify: htmlMinify
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "style.css",
      chunkFilename: "[id].css"
    }),
    new MergeIntoSingleFilePlugin({
      files: {
        "lib.js": [
          "node_modules/jquery/dist/jquery.js",
          "node_modules/knockout/build/output/knockout-latest.js",
          "node_modules/knockout-mapping/dist/knockout.mapping.js",
          "src/view_models/BaseViewModel.js",
          "src/view_models/ConfigViewModel.js",
          "src/view_models/StatusViewModel.js",
          "src/view_models/WiFiScanViewModel.js",
          "src/view_models/WiFiConfigViewModel.js",
        ],
        "home.js": [
          "src/openevse.js",
          "src/view_models/RapiViewModel.js",
          "src/view_models/TimeViewModel.js",
          "src/view_models/OpenEvseViewModel.js",
          "src/view_models/OpenEvseWiFiViewModel.js",
          "src/home.js"
        ],
        "wifi_portal.js": [
          "src/view_models/WiFiPortalViewModel.js",
          "src/wifi_portal.js"
        ]
      },
      transform: {
        "lib.js": code => uglify("lib.js", code),
        "home.js": code => uglify("home.js", code),
        "wifi_portal.js": code => uglify("wifi_portal.js", code),
      }
    })
  ],
  optimization: {
    splitChunks: {},
    minimizer: [
      new UglifyJsPlugin({}),
      new OptimizeCssAssetsPlugin({})
    ]
  }
};

function uglify(name, code)
{
  var compiled = babel.transformSync(code, {
    presets: ["@babel/preset-env"],
    sourceMaps: true
  });
  var ugly = UglifyJS.minify(compiled.code, {
    warnings: true,
    sourceMap: {
      content: compiled.map,
      url: name+".map"
    }
  });
  if(ugly.error) {
    console.log(ugly.error);
    return code;
  }
  return ugly.code;
}
