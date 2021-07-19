/* jslint node: true, esversion: 6 */
/* eslint-env node */

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
const CopyPlugin = require("copy-webpack-plugin");

require("dotenv").config();
const openevseEndpoint = process.env.OPENEVSE_ENDPOINT || "http://openevse.local";
const devHost = process.env.DEV_HOST || "localhost";
const enable_uglify = process.env.hasOwnProperty("UGLIFY") ? ("true" === process.env.UGLIFY) : true;

var htmlMinify = {
  removeComments: true,
  collapseWhitespace: true,
  conservativeCollapse: true
};

var mergeOptions = {
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
      "src/view_models/PasswordViewModel.js",
      "src/view_models/ConfigGroupViewModel.js"
    ],
    "home.js": [
      "src/openevse.js",
      //"src/tesla_auth.js",
      "src/view_models/RapiViewModel.js",
      "src/view_models/TimeViewModel.js",
      "src/view_models/ZonesViewModel.js",
      "src/view_models/OpenEvseViewModel.js",
      "src/view_models/OpenEvseWiFiViewModel.js",
      "src/view_models/ScheduleViewModel.js",
      "src/view_models/VehicleViewModel.js",
      "src/view_models/TeslaViewModel.js",
      "src/home.js"
    ],
    "term.js": [
      "node_modules/jquery/dist/jquery.js",
      "src/term.js"
    ],
    "wifi_portal.js": [
      "src/view_models/WiFiPortalViewModel.js",
      "src/wifi_portal.js"
    ]
  },
};

if(enable_uglify)
{
  console.log("Enabled Uglify");
  mergeOptions.transform = {
    "lib.js": code => uglify("lib.js", code),
    "home.js": code => uglify("home.js", code),
    "wifi_portal.js": code => uglify("wifi_portal.js", code),
    "term.js": code => uglify("term.js", code),
  };
}

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
    host: devHost,
    contentBase: "./dist",
    index: "home.html",
    proxy: [{
      context: [
        "/config",
        "/status",
        "/update",
        "/r",
        "/scan",
        "/emoncms",
        "/savenetwork",
        "/saveemoncms",
        "/savemqtt",
        "/saveadmin",
        "/saveohmkey",
        "/settime",
        "/reset",
        "/restart",
        "/apoff",
        "/divertmode",
        "/debug",
        "/evse",
        "/schedule",
        "/override",
        "/tesla"
      ],
      target: openevseEndpoint
    },
    {
      context: [
        "/ws",
        "/debug/console",
        "/evse/console"
      ],
      target: openevseEndpoint,
      ws: true
    }]
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader"
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
    new HtmlWebpackPlugin({
      filename: "term.html",
      template: "./src/term.html",
      inject: false,
      minify: htmlMinify
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "style.css",
      chunkFilename: "[id].css"
    }),
    new MergeIntoSingleFilePlugin(mergeOptions),
    new CopyPlugin([
      { from: "assets/*", flatten: true },
      { from: "posix_tz_db/zones.json", flatten: true }
    ])
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
