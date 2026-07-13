module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: './ReelScribeManager.podspec',
      },
      android: {
        sourceDir: './android',
        packageImportPath: 'import io.github.paq6809.reelscribe.manager.ReelScribeManagerPackage;',
        packageInstance: 'new ReelScribeManagerPackage()',
      },
    },
  },
};
