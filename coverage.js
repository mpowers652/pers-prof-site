const fs = require('fs');
const path = require('path');

class Coverage {
  constructor() {
    this.data = {};
  }

  track(file, line) {
    if (!this.data[file]) this.data[file] = new Set();
    this.data[file].add(line);
  }

  report() {
    return Object.entries(this.data).map(([file, lines]) => ({
      file,
      lines: lines.size,
      coverage: `${lines.size} lines covered`
    }));
  }

  save(filename = 'coverage-report.json') {
    fs.writeFileSync(filename, JSON.stringify(this.report(), null, 2));
  }
}

module.exports = new Coverage();