#!/usr/bin/env node

// Build script per Nebula con backend online
import { build } from 'vite';

async function main() {
  try {
    console.log('🚀 Building Nebula with online backend...');
    
    // Esegui il build
    await build({
      configFile: 'vite.config.ts',
    });
    
    console.log('✅ Build completato!');
    console.log('📦 Files disponibili in: dist/');
    console.log('🌐 Pronto per il deploy su GitHub Pages');
  } catch (error) {
    console.error('❌ Build fallito:', error);
    process.exit(1);
  }
}

main();