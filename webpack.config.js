const path = require('path');
const fs = require('fs');
const Dotenv = require('dotenv-webpack');
const TerserPlugin = require('terser-webpack-plugin');
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

// Plugin personalizado simple para copiar el manifest y el background script a /dist
class CopyManifestPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('CopyManifestPlugin', () => {
      // 1. Copiamos el manifest
      fs.copyFileSync(
        path.resolve(__dirname, 'manifest.json'),
        path.resolve(__dirname, 'dist', 'manifest.json'),
      );

      // 2. Copiamos el cerebro de fondo (background.js)
      fs.copyFileSync(
        path.resolve(__dirname, 'public', 'background.js'),
        path.resolve(__dirname, 'dist', 'background.js'),
      );

      // 3. Copiamos el favicon SVG (opcional)
      fs.copyFileSync(
        path.resolve(__dirname, 'public', 'favicon.svg'),
        path.resolve(__dirname, 'dist', 'favicon.svg'),
      );

      // 4. Copiamos el ICONO PNG PARA LAS NOTIFICACIONES (¡NUEVO!)
      fs.copyFileSync(
        path.resolve(__dirname, 'public', 'icon.png'),
        path.resolve(__dirname, 'dist', 'icon.png'),
      );
    });
  }
}

module.exports = {
  entry: './src/main.tsx',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts|\.tsx$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          'to-string-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              api: 'modern',
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  output: {
    filename: 'content.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            // Console-paste on Windows often re-reads this file as CP1252.
            // ASCII-only escapes keep tildes and arrows intact after eval.
            ascii_only: true,
          },
        },
      }),
    ],
  },
  plugins: [
    new Dotenv(),
    new CopyManifestPlugin(),
    // new BundleAnalyzerPlugin(),
  ],
  performance: {
    hints: false,
  },
};
