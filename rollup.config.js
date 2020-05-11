import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/table.ts',
  output: {
    dir: './lib',
    format: 'es'
  },
  plugins: [
    typescript({
      declaration: true,
      declarationDir: './lib',
      removeComments: true,
      rootDir: './src'
    }),
    terser()
  ]
};
