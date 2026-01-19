module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    ['react-native-web', { commonjs: true }],
  ],
};
