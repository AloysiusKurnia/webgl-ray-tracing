import esbuild from 'esbuild';
import { argv } from 'process';

const buildSettings = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/script.js',
    sourcemap: true,
    target: 'es2020',
    external: ['externals/*'],
    loader: { '.vert': 'text', '.frag': 'text' }
};

async function main(watch) {
    if (watch) {
        console.log('Watching for changes...');
        const context = await esbuild.context(buildSettings);
        context.watch();
    } else {
        esbuild.build(buildSettings);
    }
}

main(argv.includes('--watch'));