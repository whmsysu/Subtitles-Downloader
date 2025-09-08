module.exports = {
    mode: 'development',
    target: 'node',
    entry: [
      './view-fixed.js'
    ],
    output: {
      path: __dirname,
      publicPath: '/',
      filename: 'bundle.js'
    },
    module: {
      rules: [{
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    }
  };
  