import multi from '@rollup/plugin-multi-entry';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: ['src/list-table.ts', 'src/tree-table.ts'],
  output: {
    dir: './lib',
    format: 'es'
  },
  plugins: [
    multi({
      entryFileName: 'index.js'
    }),
    typescript({
      declaration: true,
      declarationDir: './lib',
      removeComments: true,
      rootDir: './src'
    }),
    terser()
  ]
};
