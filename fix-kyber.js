const fs = require('fs');
const path = require('path');
const kyberDir = path.join(__dirname, 'node_modules', 'crystals-kyber');

if (!fs.existsSync(kyberDir)) process.exit(0);

['kyber512.js', 'kyber768.js', 'kyber1024.js'].forEach(file => {
  const p = path.join(kyberDir, file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/^(KeyGen|Encrypt|Decrypt|Test)(512|768|1024) = function/gm, 'const $1$2 = function');
    fs.writeFileSync(p, content);
  }
});
console.log('crystals-kyber patched!');
