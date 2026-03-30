const path = require('path');
const fs = require('fs');
const Dotenv = require('dotenv-webpack');

// Plugin personalizado simple para copiar el manifest a /dist
class CopyManifestPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('CopyManifestPlugin', () => {
      fs.copyFileSync(
        path.resolve(__dirname, 'manifest.json'),
        path.resolve(__dirname, 'dist', 'manifest.json'),
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
