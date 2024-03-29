/* jslint node: true, esversion: 6 */
/* eslint-env node */

const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const MergeIntoSingleFilePlugin = require("webpack-merge-and-include-globally");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

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
    "jquery.js": [
      "node_modules/jquery/dist/jquery.js"
    ],
    "lib.js": [
      "node_modules/knockout/build/output/knockout-latest.js",
      "node_modules/knockout-mapping/dist/knockout.mapping.js",
      "node_modules/i18next-ko/lib/i18next-ko.bundle.js",
      "src/view_models/BaseViewModel.js",
      "src/view_models/ConfigViewModel.js",
      "src/view_models/StateHelperViewModel.js",
      "src/view_models/StatusViewModel.js",
      "src/view_models/TimeViewModel.js",
      "src/view_models/WiFiScanViewModel.js",
      "src/view_models/WiFiConfigViewModel.js",
      "src/view_models/PasswordViewModel.js",
      "src/view_models/ConfigGroupViewModel.js",
      "src/view_models/ScheduleViewModel.js"
    ],
    "home.js": [
      "src/openevse.js",
      //"src/tesla_auth.js",
      "src/view_models/RapiViewModel.js",
      "src/view_models/ZonesViewModel.js",
      "src/view_models/OpenEvseViewModel.js",
      "src/view_models/OpenEvseWiFiViewModel.js",
      "src/view_models/ScheduleViewModel.js",
      "src/view_models/SchedulePlanViewModel.js",
      "src/view_models/VehicleViewModel.js",
      "src/view_models/TeslaViewModel.js",
      "src/view_models/EventLogViewModel.js",
      "src/view_models/RFIDViewModel.js",
      "src/home.js"
    ],
    "term.js": [
      "src/term.js"
    ],
    "wifi_portal.js": [
      "src/view_models/WiFiPortalViewModel.js",
      "src/wifi_portal.js"
    ],
    "localisation.js": [
      "src/localisation.js"
    ]
  },
};

var minimizers = [];

if(enable_uglify)
{
  minimizers.push(new TerserPlugin({}));
  minimizers.push(new CssMinimizerPlugin({}));
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
    webSocketServer: false,
    static: {
      directory: "./dist"
    },
    devMiddleware: {
      index: "home.html"
    },
    proxy:
    [
      {
        context: [
          "/config",
          "/status",
          "/update",
          "/r",
          "/scan",
          "/settime",
          "/reset",
          "/restart",
          "/apoff",
          "/divertmode",
          "/debug",
          "/evse",
          "/schedule",
          "/override",
          "/tesla",
          "/logs",
          "/emeter",
          "/time"
        ],
        target: openevseEndpoint
      },
      {
        context: [
          "/ws",
          "/evse/console",
          "/debug/console"
        ],
        target: openevseEndpoint.replace("http", "ws"),
        ws: true
      }
    ]
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
    new CopyPlugin({ patterns: [
      { from: "assets/*", to: "[name][ext]" },
      { from: "posix_tz_db/zones.json", to: "[name][ext]" }
    ]}),
    new CompressionPlugin({
      test: /\.(html|js|json|svg|css)(\?.*)?$/i,
    })
  ],
  optimization: {
    splitChunks: {},
    minimizer: minimizers
  }
};
