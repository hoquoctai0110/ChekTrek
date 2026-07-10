module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@features': './src/features',
            '@navigation': './src/navigation',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@theme': './src/theme',
            '@types': './src/types',
            '@constants': './src/constants',
            '@utils': './src/utils',
            '@assets': './src/assets',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
