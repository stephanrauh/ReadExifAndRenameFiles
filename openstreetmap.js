const https = require('https');
const convert = require('xml-js');
const fs = require('fs');
const exif = require('exif-parser');
const heicExif = require('./heic-exif-reader');

async function parseJpgFile(file = 'some.jpg') {
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

  // console.log(3);
  if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
    // console.log(4);
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
}

async function parseHeicFile(file = 'some.heic') {
  const buffer = fs.readFileSync(file);
  const result = heicExif.findEXIFinHEIC(buffer);

  //const hdr = result.tags.CustomRendered === 3;
  const focalLength = result.FocalLengthIn35mmFilm + 'mm';
  await sleep(1100);
  let newFile = file.substring(0, file.length - 5);
  const offset = newFile.lastIndexOf("/");
  newFile = newFile.substring(0, offset+11) +  newFile.substring(offset+11, offset+19).replace("-", ".").replace("-", ".") + newFile.substring(offset+19);
  newFile += ' ' + focalLength;
  newFile = newFile + '.heic';

  // console.log(3);
  if (result.GPSLatitude && result.GPSLongitude) {
    // console.log(4);
    let long = result.GPSLongitude[0] + result.GPSLongitude[1]/60 + result.GPSLongitude[2]/3600;
    if (result.GPSLongitudeRef === 'S') {
      long = -long;
    }
    let lat = result.GPSLatitude[0] + result.GPSLatitude[1]/60 + result.GPSLatitude[2]/3600;
    if (result.GPSLongitudeRef === 'W') {
      long = -long;
    }
  
    getTown(lat, long, result => {
      newFile = newFile.substring(0, newFile.length - 5);
      if (result) {
        newFile = newFile + ' ' + result;
      }
      newFile = newFile + '.heic';
      console.log('uncomment line 85 to rename ' + newFile);
      fs.renameSync(file, newFile);
    });
  } else if (file !== newFile) {
    console.log('rename ' + newFile);
//    fs.renameSync(file, newFile);
  }
}

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

  // console.log(options.path);

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
          callback(geo.reversegeocode.addressparts.town._text.replace("/", "-"));
        } else if (geo.reversegeocode.addressparts.city) {
          callback(geo.reversegeocode.addressparts.city._text.replace("/", "-"));
        } else if (geo.reversegeocode.addressparts.village) {
          callback(geo.reversegeocode.addressparts.village._text.replace("/", "-"));
        } else if (geo.reversegeocode.addressparts.hamlet) {
          callback(geo.reversegeocode.addressparts.hamlet._text.replace("/", "-"));
        } else if (geo.reversegeocode.addressparts.city_district) {
          callback(geo.reversegeocode.addressparts.city_district._text.replace("/", "-"));
        } else {
          console.log(geo.reversegeocode.addressparts);
        }
      });
    }
  );

  g.end();
}

module.exports.addInfoToFilename = async function(file) {
//  console.log(file);
  if (file.includes('mm')) {
    return;
  }
  if (!file.endsWith('.heic')) {
    return;
  }
  // console.log('2');
  if (file.endsWith('.heic')) {
    parseHeicFile(file);
  } else {
    parseJpgFile(file);
  }
};
