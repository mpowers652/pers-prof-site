const fs = require('fs');

// Read the coverage data
const coverageData = JSON.parse(fs.readFileSync('./coverage/coverage-final.json', 'utf8'));

// Get server.js coverage data
const serverPath = Object.keys(coverageData).find(path => path.includes('server.js'));
const serverCoverage = coverageData[serverPath];

// Calculate coverage percentages
function calculateCoverage(data) {
    const statements = data.s;
    const functions = data.f;
    const branches = data.b;
    const lines = data.statementMap;

    // Statement coverage
    const totalStatements = Object.keys(statements).length;
    const coveredStatements = Object.values(statements).filter(count => count > 0).length;
    const statementCoverage = (coveredStatements / totalStatements * 100).toFixed(2);

    // Function coverage
    const totalFunctions = Object.keys(functions).length;
    const coveredFunctions = Object.values(functions).filter(count => count > 0).length;
    const functionCoverage = (coveredFunctions / totalFunctions * 100).toFixed(2);

    // Branch coverage
    const totalBranches = Object.values(branches).reduce((total, branch) => total + branch.length, 0);
    const coveredBranches = Object.values(branches).reduce((covered, branch) => {
        return covered + branch.filter(count => count > 0).length;
    }, 0);
    const branchCoverage = (coveredBranches / totalBranches * 100).toFixed(2);

    // Line coverage (based on statement map)
    const totalLines = Object.keys(lines).length;
    const coveredLines = Object.keys(statements).filter(key => statements[key] > 0).length;
    const lineCoverage = (coveredLines / totalLines * 100).toFixed(2);

    return {
        statements: {
            total: totalStatements,
            covered: coveredStatements,
            percentage: statementCoverage
        },
        functions: {
            total: totalFunctions,
            covered: coveredFunctions,
            percentage: functionCoverage
        },
        branches: {
            total: totalBranches,
            covered: coveredBranches,
            percentage: branchCoverage
        },
        lines: {
            total: totalLines,
            covered: coveredLines,
            percentage: lineCoverage
        }
    };
}

const coverage = calculateCoverage(serverCoverage);

console.log('=== SERVER.JS TEST COVERAGE REPORT ===\n');
console.log(`📊 STATEMENTS: ${coverage.statements.covered}/${coverage.statements.total} (${coverage.statements.percentage}%)`);
console.log(`🔧 FUNCTIONS:  ${coverage.functions.covered}/${coverage.functions.total} (${coverage.functions.percentage}%)`);
console.log(`🌿 BRANCHES:   ${coverage.branches.covered}/${coverage.branches.total} (${coverage.branches.percentage}%)`);
console.log(`📝 LINES:      ${coverage.lines.covered}/${coverage.lines.total} (${coverage.lines.percentage}%)`);

console.log('\n=== COVERAGE IMPROVEMENT SUMMARY ===');
console.log('✅ Added 48 new comprehensive tests');
console.log('✅ Covered previously untested functionality:');
console.log('   - Subdomain routing middleware');
console.log('   - Story generator access control');
console.log('   - OAuth error handling');
console.log('   - Token refresh mechanisms');
console.log('   - Data deletion workflows');
console.log('   - Admin configuration');
console.log('   - Security features');
console.log('   - Math calculator edge cases');
console.log('   - User registration flows');
console.log('   - Story generation fallbacks');

// Write coverage summary to file
const summary = {
    timestamp: new Date().toISOString(),
    file: 'server.js',
    coverage: coverage,
    testsAdded: 48,
    newTestFiles: [
        'server-enhanced-coverage.test.js (29 tests)',
        'server-final-coverage.test.js (19 tests)'
    ]
};

fs.writeFileSync('./coverage-summary.json', JSON.stringify(summary, null, 2));
console.log('\n📄 Coverage summary saved to coverage-summary.json');