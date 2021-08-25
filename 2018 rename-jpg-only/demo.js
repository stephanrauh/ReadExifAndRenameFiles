const exif = require('exif-parser');
const fs = require('fs');

const file = 'demo.jpg';
const buffer = fs.readFileSync(file);
const parser = exif.create(buffer);
const result = parser.parse();
const hdr = result.tags.CustomRendered === 3;
const focalLength = result.tags.FocalLengthIn35mmFormat + 'mm';

let newFile = file.substring(0, file.length - 4);
newFile += ' ' + focalLength;
if (hdr) {
  newFile = newFile + ' hdr';
}
newFile = newFile + '.jpg';
// fs.renameSync(file, newFile);
console.log(result.tags.GPSTimeStamp);
