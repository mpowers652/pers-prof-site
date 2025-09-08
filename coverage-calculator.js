const fs = require('fs');
const path = require('path');
const coverage = require('./coverage.js');

function calculateTestCoverage() {
    try {
        // Read the existing coverage data
        const coverageDataPath = path.join(__dirname, 'coverage', 'coverage-final.json');
        const coverageData = JSON.parse(fs.readFileSync(coverageDataPath, 'utf8'));
        
        let totalStatements = 0;
        let coveredStatements = 0;
        let totalFunctions = 0;
        let coveredFunctions = 0;
        let totalBranches = 0;
        let coveredBranches = 0;
        let totalLines = 0;
        let coveredLines = 0;
        
        const fileResults = [];
        
        // Process each file in coverage data
        Object.keys(coverageData).forEach(filePath => {
            const fileData = coverageData[filePath];
            
            // Skip coverage report files themselves
            if (filePath.includes('coverage\\lcov-report')) {
                return;
            }
            
            // Calculate statements coverage
            const statements = fileData.s || {};
            const stmtTotal = Object.keys(statements).length;
            const stmtCovered = Object.values(statements).filter(count => count > 0).length;
            
            // Calculate functions coverage
            const functions = fileData.f || {};
            const funcTotal = Object.keys(functions).length;
            const funcCovered = Object.values(functions).filter(count => count > 0).length;
            
            // Calculate branches coverage
            const branches = fileData.b || {};
            let branchTotal = 0;
            let branchCovered = 0;
            
            Object.values(branches).forEach(branchArray => {
                if (Array.isArray(branchArray)) {
                    branchTotal += branchArray.length;
                    branchCovered += branchArray.filter(count => count > 0).length;
                }
            });
            
            // Calculate line coverage (approximate from statements)
            const lineTotal = stmtTotal;
            const lineCovered = stmtCovered;
            
            // Add to totals
            totalStatements += stmtTotal;
            coveredStatements += stmtCovered;
            totalFunctions += funcTotal;
            coveredFunctions += funcCovered;
            totalBranches += branchTotal;
            coveredBranches += branchCovered;
            totalLines += lineTotal;
            coveredLines += lineCovered;
            
            // Store file result
            const fileName = path.basename(filePath);
            fileResults.push({
                file: fileName,
                statements: { covered: stmtCovered, total: stmtTotal, pct: stmtTotal ? (stmtCovered / stmtTotal * 100).toFixed(2) : 0 },
                functions: { covered: funcCovered, total: funcTotal, pct: funcTotal ? (funcCovered / funcTotal * 100).toFixed(2) : 0 },
                branches: { covered: branchCovered, total: branchTotal, pct: branchTotal ? (branchCovered / branchTotal * 100).toFixed(2) : 0 },
                lines: { covered: lineCovered, total: lineTotal, pct: lineTotal ? (lineCovered / lineTotal * 100).toFixed(2) : 0 }
            });
            
            // Track coverage for our custom coverage system
            coverage.track(filePath, stmtCovered);
        });
        
        // Calculate overall percentages
        const overallCoverage = {
            statements: {
                covered: coveredStatements,
                total: totalStatements,
                pct: totalStatements ? (coveredStatements / totalStatements * 100).toFixed(2) : 0
            },
            functions: {
                covered: coveredFunctions,
                total: totalFunctions,
                pct: totalFunctions ? (coveredFunctions / totalFunctions * 100).toFixed(2) : 0
            },
            branches: {
                covered: coveredBranches,
                total: totalBranches,
                pct: totalBranches ? (coveredBranches / totalBranches * 100).toFixed(2) : 0
            },
            lines: {
                covered: coveredLines,
                total: totalLines,
                pct: totalLines ? (coveredLines / totalLines * 100).toFixed(2) : 0
            }
        };
        
        // Generate report
        const report = {
            summary: overallCoverage,
            files: fileResults.sort((a, b) => parseFloat(b.statements.pct) - parseFloat(a.statements.pct))
        };
        
        // Save coverage report
        coverage.save('test-coverage-report.json');
        
        return report;
        
    } catch (error) {
        console.error('Error calculating coverage:', error.message);
        return {
            summary: {
                statements: { covered: 0, total: 0, pct: 0 },
                functions: { covered: 0, total: 0, pct: 0 },
                branches: { covered: 0, total: 0, pct: 0 },
                lines: { covered: 0, total: 0, pct: 0 }
            },
            files: [],
            error: error.message
        };
    }
}

// Export for use in other modules
module.exports = { calculateTestCoverage };

// Run if called directly
if (require.main === module) {
    const result = calculateTestCoverage();
    console.log('\n=== TEST COVERAGE REPORT ===\n');
    
    console.log('OVERALL COVERAGE:');
    console.log(`Statements: ${result.summary.statements.covered}/${result.summary.statements.total} (${result.summary.statements.pct}%)`);
    console.log(`Functions:  ${result.summary.functions.covered}/${result.summary.functions.total} (${result.summary.functions.pct}%)`);
    console.log(`Branches:   ${result.summary.branches.covered}/${result.summary.branches.total} (${result.summary.branches.pct}%)`);
    console.log(`Lines:      ${result.summary.lines.covered}/${result.summary.lines.total} (${result.summary.lines.pct}%)`);
    
    console.log('\nFILE BREAKDOWN:');
    result.files.forEach(file => {
        console.log(`${file.file}: ${file.statements.pct}% statements, ${file.functions.pct}% functions, ${file.branches.pct}% branches`);
    });
    
    if (result.error) {
        console.log(`\nError: ${result.error}`);
    }
}