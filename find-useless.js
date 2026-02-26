const fs = require('fs');
const path = require('path');

function findEmptyFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findEmptyFiles(filePath, fileList);
    } else {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.trim() === '' || !content.includes('export')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const emptyFiles = findEmptyFiles(path.join(__dirname, 'src/app/api'));
console.log('Found ' + emptyFiles.length + ' useless files:');
emptyFiles.forEach(f => console.log(f));
