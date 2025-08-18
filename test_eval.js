const { evaluate } = require('mathjs');

function evaluateExpression(expr) {
    try {
        expr = expr.replace(/×/g, '*')
               .replace(/÷/g, '/')
               .replace(/π/g, 'pi')
               .replace(/\be\b/g, 'e')
               .replace(/\^/g, '^')
               .replace(/(\d+(?:\.\d+)?)!/g, '$1!')
        
        let result = evaluate(expr);
        
        if (result && typeof result === 'object' && result.re !== undefined) {
            if (Math.abs(result.im) < 1e-14) {
                return result.re;
            }
            const real = Math.abs(result.re) < 1e-14 ? 0 : result.re;
            const imag = Math.abs(result.im) < 1e-14 ? 0 : result.im;
            
            if (real === 0 && imag === 1) return 'i';
            if (real === 0 && imag === -1) return '-i';
            if (real === 0 && imag !== 0) return `${imag}i`;
            if (imag === 0) return real;
            if (imag === 1) return `${real} + i`;
            if (imag === -1) return `${real} - i`;
            if (imag > 0) return `${real} + ${imag}i`;
            return `${real} - ${Math.abs(imag)}i`;
        }
        
        if (typeof result === 'number' && isFinite(result)) {
            const rounded = Math.round(result);
            if (Math.abs(result - rounded) < 1e-14) {
                return rounded;
            }
            return Math.round(result * 1e15) / 1e15;
        }
        
        return result;
    } catch (error) {
        console.error('Error evaluating expression:', error);
        return expr;
    }
}

console.log('Imaginary i:', evaluateExpression('i'));
console.log('Real 2^3:', evaluateExpression('2^3'));
console.log('Complex 2*i + 3:', evaluateExpression('2*i + 3'));
console.log('Complex i^2:', evaluateExpression('i^2'));