import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs'
    },
    {
      file: 'dist/index.esm.js',
      format: 'es'
    }
  ],
  external: ['fflate'],
  plugins: [typescript({
    exclude: ['**/*.test.ts']    // Exclude test files from build
  })]
};