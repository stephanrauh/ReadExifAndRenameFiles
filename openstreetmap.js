const https = require('https');
const convert = require('xml-js');
const fs = require('fs');
const exif = require('exif-parser');

const logTown = result => {
  console.log('Town = ' + result);
};

function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

function getTown(latitude, longitude, callback = logTown) {
  var options = {
    host: 'nominatim.openstreetmap.org',
    path: '/reverse?format=xml&lat=' + latitude + '&lon=' + longitude + '&zoom=18&addressdetails=1',
    method: 'GET',
    headers: {
      referer: '(some referer)', // TODO put your referer here
      'user-agent': '(some agent)' // TODO put your agent here
    }
  };

  console.log(options.path);

  var g = https.get(
    options,
    //'https://nominatim.openstreetmap.org/reverse?format=xml&lat=52.5487429714954&lon=-1.81602098644987&zoom=18&addressdetails=1',
    response => {
      var body = '';
      response.on('data', function(d) {
        body += d;
      });
      response.on('end', function() {
        // Data reception is done, do whatever with it!
        const result1 = convert.xml2json(body, { compact: true, spaces: 4 });
        const geo = JSON.parse(result1);
        if (geo.reversegeocode.addressparts.town) {
          callback(geo.reversegeocode.addressparts.town._text);
        } else if (geo.reversegeocode.addressparts.city) {
          callback(geo.reversegeocode.addressparts.city._text);
        } else if (geo.reversegeocode.addressparts.village) {
          callback(geo.reversegeocode.addressparts.village._text);
        } else if (geo.reversegeocode.addressparts.hamlet) {
          callback(geo.reversegeocode.addressparts.hamlet._text);
        } else {
          console.log(geo.reversegeocode.addressparts);
        }
      });
    }
  );

  g.end();
}

module.exports.addInfoToFilename = async function(file) {
  if (file.includes('mm')) {
    return;
  }
  if (!file.endsWith('.jpg')) {
    return;
  }
  const buffer = fs.readFileSync(file);
  const parser = exif.create(buffer);
  const result = parser.parse();
  const hdr = result.tags.CustomRendered === 3;
  const focalLength = result.tags.FocalLengthIn35mmFormat + 'mm';
  await sleep(1100);
  let newFile = file.substring(0, file.length - 4);
  newFile += ' ' + focalLength;
  if (hdr) {
    newFile = newFile + ' hdr';
  }
  newFile = newFile + '.jpg';

  if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
    getTown(result.tags.GPSLatitude, result.tags.GPSLongitude, result => {
      newFile = newFile.substring(0, newFile.length - 4);
      if (result) {
        newFile = newFile + ' ' + result;
      }
      newFile = newFile + '.jpg';
      console.log('uncomment line 85 to rename ' + newFile);
      // fs.renameSync(file, newFile);
    });
  } else {
    console.log('rename ' + newFile);
    fs.renameSync(file, newFile);
  }
};
