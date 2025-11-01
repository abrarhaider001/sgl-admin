#!/usr/bin/env node

/**
 * Performance monitoring script for Next.js development server
 * Measures compilation times and provides optimization recommendations
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor() {
    this.startTime = null;
    this.compilationTimes = [];
    this.recommendations = [];
  }

  startMonitoring() {
    console.log('🚀 Starting Next.js Performance Monitor...');
    this.startTime = Date.now();
    
    // Monitor development server
    const devServer = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true
    });

    devServer.stdout.on('data', (data) => {
      const output = data.toString();
      this.parseOutput(output);
    });

    devServer.stderr.on('data', (data) => {
      const output = data.toString();
      this.parseOutput(output);
    });

    // Monitor for 30 seconds then provide report
    setTimeout(() => {
      this.generateReport();
      devServer.kill();
    }, 30000);
  }

  parseOutput(output) {
    // Parse compilation times
    const readyMatch = output.match(/✓ Ready in (\d+)ms/);
    if (readyMatch) {
      const time = parseInt(readyMatch[1]);
      this.compilationTimes.push(time);
      console.log(`📊 Server ready in ${time}ms`);
    }

    // Parse compilation events
    const compilingMatch = output.match(/○ Compiling (.+) \.\.\./); 
    if (compilingMatch) {
      console.log(`🔄 Compiling: ${compilingMatch[1]}`);
    }

    // Check for warnings
    if (output.includes('Warning:')) {
      this.recommendations.push('Address Next.js configuration warnings');
    }

    if (output.includes('Turbopack')) {
      console.log('⚡ Turbopack enabled - faster builds expected');
    }
  }

  generateReport() {
    console.log('\n📈 Performance Report:');
    console.log('========================');
    
    if (this.compilationTimes.length > 0) {
      const avgTime = this.compilationTimes.reduce((a, b) => a + b, 0) / this.compilationTimes.length;
      const minTime = Math.min(...this.compilationTimes);
      const maxTime = Math.max(...this.compilationTimes);
      
      console.log(`Average compilation time: ${avgTime.toFixed(0)}ms`);
      console.log(`Fastest compilation: ${minTime}ms`);
      console.log(`Slowest compilation: ${maxTime}ms`);
      
      // Performance assessment
      if (avgTime < 1000) {
        console.log('✅ Excellent performance!');
      } else if (avgTime < 2000) {
        console.log('✅ Good performance');
      } else if (avgTime < 3000) {
        console.log('⚠️  Moderate performance - room for improvement');
      } else {
        console.log('❌ Poor performance - optimization needed');
        this.recommendations.push('Consider reducing bundle size');
        this.recommendations.push('Enable more aggressive caching');
      }
    }

    // Check project structure
    this.analyzeProjectStructure();
    
    // Display recommendations
    if (this.recommendations.length > 0) {
      console.log('\n💡 Optimization Recommendations:');
      this.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('\n🎯 Additional Tips:');
    console.log('- Use dynamic imports for large components');
    console.log('- Optimize images with Next.js Image component');
    console.log('- Consider using React.memo for expensive components');
    console.log('- Enable incremental static regeneration where possible');
  }

  analyzeProjectStructure() {
    const srcPath = path.join(process.cwd(), 'src');
    const appPath = path.join(srcPath, 'app');
    
    if (fs.existsSync(appPath)) {
      const pages = this.countFiles(appPath, '.tsx');
      console.log(`\n📁 Project Analysis:`);
      console.log(`Total pages: ${pages}`);
      
      if (pages > 20) {
        this.recommendations.push('Consider code splitting for large applications');
      }
    }

    // Check for large dependencies
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const depCount = Object.keys(packageJson.dependencies || {}).length;
      
      console.log(`Dependencies: ${depCount}`);
      
      if (depCount > 50) {
        this.recommendations.push('Review and remove unused dependencies');
      }
    }
  }

  countFiles(dir, extension) {
    let count = 0;
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          count += this.countFiles(filePath, extension);
        } else if (file.endsWith(extension)) {
          count++;
        }
      });
    } catch (error) {
      // Ignore errors
    }
    return count;
  }
}

// Run the monitor
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.startMonitoring();
}

module.exports = PerformanceMonitor;