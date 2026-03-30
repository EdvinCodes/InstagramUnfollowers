const path = require('path');
const fs = require('fs');
const Dotenv = require('dotenv-webpack');

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

      // (Opcional) Si tienes tu icono en public para que salga en la notificación:
      fs.copyFileSync(
        path.resolve(__dirname, 'public', 'favicon.svg'),
        path.resolve(__dirname, 'dist', 'favicon.svg'),
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
        use: ['to-string-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  output: {
    filename: 'content.js', // Cambiado de dist.js a content.js
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new Dotenv(),
    new CopyManifestPlugin(), // Añadimos nuestro plugin copiador
  ],
};
