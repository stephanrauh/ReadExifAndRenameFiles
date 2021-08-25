import * as fs from 'fs';
import exifr from 'exifr';
import { getTown } from './openstreetmap';
import { collectFiles, findDuplicates } from './file-collector';
const exiftool = require('exiftool');
import { ByDate, FileGroup } from './type';

const dir = '<put your image upload folder here>';

let commands = [] as Array<string>;

let byDate: ByDate = {};
let withoutExif: Array<FileGroup> = [];
let allTimestamps: Array<string> = [];

async function moveAndRenameFile(group: FileGroup): Promise<void> {
  let byDateFilename: string | undefined;
  let newFilename: string | undefined;
  let alternativeFilename: string | undefined;
  if (group.heic) {
    const file = group.heic;
    const result = await exifr.parse(group.folder + '/' + file);
    [byDateFilename, newFilename, alternativeFilename] = await parseImageExif(result, group.heic);
  }

  if (!newFilename || newFilename.includes('NaN') || newFilename.includes('undefined') || newFilename.includes('//')) {
    if (group.jpg) {
      const file = group.jpg;
      const result = await exifr.parse(group.folder + '/' + file);
      [byDateFilename, newFilename, alternativeFilename] = await parseImageExif(result, group.jpg);
    }
  }

  if (!newFilename || newFilename.includes('NaN') || newFilename.includes('undefined') || newFilename.includes('//')) {
    if (group.mov) {
      const fileContent = fs.readFileSync(group.folder + group.mov);
      const exif = await getMetadataFromMov(fileContent);
      [byDateFilename, newFilename, alternativeFilename] = await parseMovieExif(exif, group.mov);
    }
  }

  if (!newFilename) {
    console.log('Not processed: ' + JSON.stringify(group));
  }

  if (newFilename) {
    if (newFilename.includes('NaN') || newFilename.includes('undefined') || newFilename.includes('//')) {
      if (group.jpg) {
        const { birthtime } = fs.statSync(group.folder + group.jpg);
        withoutExif.push(group); // try to process it later
        group.createDate = birthtime;
      } else if (group.heic) {
        const { birthtime } = fs.statSync(group.folder + group.heic);
        withoutExif.push(group); // try to process it later
        group.createDate = birthtime;
      } else if (group.mov) {
        const { birthtime } = fs.statSync(group.folder + group.mov);
        withoutExif.push(group); // try to process it later
        group.createDate = birthtime;
      }
    } else {
      const folder = newFilename.substring(0, newFilename.lastIndexOf('/'));
      const alternativeFolder = alternativeFilename!.substring(0, alternativeFilename!.lastIndexOf('/'));
      const originalFolder = byDateFilename!.substring(0, byDateFilename!.lastIndexOf('/'));
      if (!commands.includes(`mkdir -p "${originalFolder}"`)) {
        if (!fs.existsSync(originalFolder)) {
          commands.push(`mkdir -p "${originalFolder}"`);
        }
      }
      if (!commands.includes(`mkdir -p "${folder}"`)) {
        if (!fs.existsSync(folder)) {
          commands.push(`mkdir -p "${folder}"`);
        }
      }
      if (!commands.includes(`mkdir -p "${alternativeFolder}"`)) {
        if (!fs.existsSync(alternativeFolder)) {
          commands.push(`mkdir -p "${alternativeFolder}"`);
        }
      }
      if (group.heic) {
        const cmd = `mv "${group.folder}/${group.heic}" "${byDateFilename}.HEIC"`;
        const cmd2 = `ln -s "${byDateFilename}.HEIC" "${newFilename}.HEIC"`;
        const cmd3 = `ln -s "${byDateFilename}.HEIC" "${alternativeFilename}.HEIC"`;
        if (!commands.includes(cmd)) {
          if (group.folder + group.heic !== `${byDateFilename}.HEIC`) {
            commands.push(cmd);
          }
        }
        if (!commands.includes(cmd2)) {
          if (!fs.existsSync(newFilename + '.HEIC')) {
            commands.push(cmd2);
          }
        }
        if (!commands.includes(cmd3)) {
          if (!fs.existsSync(alternativeFilename + '.HEIC')) {
            commands.push(cmd3);
          }
        }
      }
      if (group.jpg) {
        const cmd = `mv "${group.folder}/${group.jpg}" "${byDateFilename}.JPG"`;
        const cmd2 = `ln -s "${byDateFilename}.JPG" "${newFilename}.JPG"`;
        const cmd3 = `ln -s "${byDateFilename}.JPG" "${alternativeFilename}.JPG"`;

        if (!commands.includes(cmd)) {
          if (group.folder + group.jpg !== `${byDateFilename}.JPG`) {
            commands.push(cmd);
          }
        }
        if (!commands.includes(cmd2)) {
          if (!fs.existsSync(newFilename + '.JPG')) {
            commands.push(cmd2);
          }
        }
        if (!commands.includes(cmd3)) {
          if (!fs.existsSync(alternativeFilename + '.JPG')) {
            commands.push(cmd3);
          }
        }
      }
      if (group.mov) {
        const cmd = `mv "${group.folder}/${group.mov}" "${byDateFilename}.MOV"`;
        const cmd2 = `ln -s "${byDateFilename}.MOV" "${newFilename}.MOV"`;
        const cmd3 = `ln -s "${byDateFilename}.MOV" "${alternativeFilename}.MOV"`;

        if (!commands.includes(cmd)) {
          if (group.folder + group.mov !== `${byDateFilename}.MOV`) {
            commands.push(cmd);
          }
        }
        if (!commands.includes(cmd2)) {
          if (!fs.existsSync(newFilename + '.MOV')) {
            commands.push(cmd2);
          }
        }
        if (!commands.includes(cmd3)) {
          if (!fs.existsSync(alternativeFilename + '.MOV')) {
            commands.push(cmd3);
          }
        }
      }
      if (group.aae) {
        const cmd = `mv "${group.folder}/${group.aae}" "${byDateFilename}.AAE"`;
        const cmd2 = `ln -s "${byDateFilename}.AAE" "${newFilename}.AAE"`;
        const cmd3 = `ln -s "${byDateFilename}.AAE" "${alternativeFilename}.AAE"`;

        if (!commands.includes(cmd)) {
          if (group.folder + group.aae !== `${byDateFilename}.AAE`) {
            commands.push(cmd);
          }
        }
        if (!commands.includes(cmd2)) {
          if (!fs.existsSync(newFilename + '.AAE')) {
            commands.push(cmd2);
          }
        }
        if (!commands.includes(cmd3)) {
          if (!fs.existsSync(alternativeFilename + '.AAE')) {
            commands.push(cmd3);
          }
        }
      }
    }
  } else {
    console.log('Not processed: ' + JSON.stringify(group));
  }
}

function convertDMSToDEG(dms: string): number | undefined {
  if (!dms) {
    return undefined;
  }
  dms = dms.replace(' deg', '').replace("'", '').replace("''", '');
  const dms_Array = dms.split(/[^\d\w\.]+/);
  const degrees = dms_Array[0];
  const minutes = dms_Array[1];
  const seconds = dms_Array[2];
  const direction = dms_Array[3];

  let deg = Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600;

  if (direction == 'S' || direction == 'W') {
    deg = deg * -1;
  } // Don't do anything for N or E
  return deg;
}

async function parseMovieExif(exif: any, originalFilename: string): Promise<Array<string>> {
  if (!exif.createDate) {
    console.log(exif);
    process.exit();
  }
  const datum = exif.createDate.split(' ')[0].split(':');
  const zeit = exif.createDate.split(' ')[1].split(':');

  const year = datum[0];
  const month = datum[1];
  const day = datum[2];
  let hour = String(Number(zeit[0]) + 2); // European summer time
  if (hour.length === 0) {
    hour = '0' + hour;
  }
  const minute = zeit[1];
  const seconds = zeit[2];

  const location = await getTown(convertDMSToDEG(exif.gpsLatitude), convertDMSToDEG(exif.gpsLongitude), dir);
  let village = ' ' + `${location.state} ${location.town}`.trim();
  if (village === ' ') {
    village = '';
  }
  let region = `${location.country}`;
  if (location.country === 'Deutschland') {
    region = location.state;
    village = ' ' + location.town;
  }
  const altitude = exif.gpsAltitude ? '' : `, altitude ${exif.gpsAltitude}m`;
  const filename = `${dir}/chronological/${year}/${region}/${month}/${day}${village}/${hour}.${minute}.${seconds} Uhr${altitude}`;
  const alternativeFilename = `${dir}/by region/${region}/${village.trim()}/${year}-${month}-${day} ${hour}.${minute}.${seconds} Uhr${altitude}`;
  const original = `${dir}/original/${year}/${month}/${day}/${originalFilename}`.replace('.MOV', '');

  return [original, filename, alternativeFilename];
}

async function parseImageExif(result: any, originalFilename: string): Promise<Array<string>> {
  const createDate = new Date(result.CreateDate);
  const year = createDate.getFullYear();
  const month = createDate.getMonth() < 9 ? '0' + (createDate.getMonth() + 1) : createDate.getMonth() + 1;
  const day = createDate.getDate() < 10 ? '0' + createDate.getDate() : createDate.getDate();
  const hour = createDate.getHours() < 10 ? '0' + createDate.getHours() : createDate.getHours();
  const minute = createDate.getMinutes() < 10 ? '0' + createDate.getMinutes() : createDate.getMinutes();
  const seconds = createDate.getSeconds() < 10 ? '0' + createDate.getSeconds() : createDate.getSeconds();
  let milliseconds = '';

  let timestamp = `${year}-${month}-${day} ${hour}.${minute}.${seconds}${milliseconds}`;
  if (allTimestamps.includes(timestamp)) {
    let counter = 1;
    do {
      milliseconds = '-' + String(counter);
      timestamp = `${year}-${month}-${day} ${hour}.${minute}.${seconds}${milliseconds}`;
      if (!allTimestamps.includes(timestamp)) {
        console.log('Possibly duplicate picture: ' + `${dir}/original/${year}/${month}/${day}/${originalFilename}`);
        break;
      }
      counter++;
    } while (true);
  }
  allTimestamps.push(timestamp);
  const hdr = result.CustomRendered === 3 ? ' HDR' : '';
  const focalLength = result.FocalLengthIn35mmFormat + 'mm';
  let exposure = result.ExposureTime;
  if (exposure < 1) {
    exposure = Math.round(exposure * 10000) / 10 + 'ms';
  } else {
    exposure = Math.round(exposure * 10) / 10 + 's';
  }
  const iso = result.ISO;
  const height = Math.round(result.GPSAltitude);

  const altitude = String(height) === 'NaN' ? '' : `, altitude ${height}m`;
  const location = await getTown(result.latitude, result.longitude, dir);
  let village = ' ' + `${location.state} ${location.town}`.trim();

  if (village === ' ') {
    village = '';
  }
  let region = `${location.country}`;
  if (location.country === 'Deutschland') {
    region = location.state;
    village = ' ' + location.town;
  }
  const filename =
    `${dir}/chronological/${year}/${region}/${month}/${day}${village}/${hour}.${minute}.${seconds}${milliseconds} Uhr, ${focalLength}, ${exposure}, ISO ${iso}${altitude} ${hdr}`.trim();
  const alternativeFilename = `${dir}/by region/${region}/${village.trim()}/${year}-${month}-${day} ${hour}.${minute}.${seconds}${milliseconds} Uhr, ${focalLength}, ${exposure}, ISO ${iso}${altitude} ${hdr}`;
  if (!filename.includes('NaN') && !filename.includes('undefined') && location.state !== '') {
    byDate[createDate.getTime()] = [filename, alternativeFilename];
  }
  const original = `${dir}/original/${year}/${month}/${day}/${originalFilename}`.replace('.HEIC', '').replace('.JPG', '');
  return [original, filename, alternativeFilename];
}

function getMetadataFromMov(fileContent: any): Promise<any> {
  return new Promise((resolve: any) => {
    exiftool.metadata(fileContent, function (err: any, metadata: any) {
      if (err) {
        throw err;
      } else {
        resolve(metadata);
      }
    });
  });
}

function findImagesWithSimilarDate() {
  commands.push('');
  commands.push('# guesswork starts here');
  commands.push('');
  withoutExif.forEach((group) => {
    let closest: Array<string> | undefined = undefined;
    let closestTime = 0;
    if (group.createDate) {
      const cd = group.createDate.getTime();
      Object.entries(byDate).forEach((entry) => {
        const otherTime = Number(entry[0]);
        if (Math.abs(otherTime - cd) < Math.abs(closestTime - cd)) {
          closestTime = otherTime;
          closest = entry[1];
        }
      });
      if (closest) {
        const c = closest as Array<string>;
        const folder = c[0].substring(0, c[0].lastIndexOf('/'));
        const alternativeFolder = c[1].substring(0, c[1].lastIndexOf('/'));
        const year = group.createDate.getFullYear() < 10 ? '0' + group.createDate.getFullYear() : group.createDate.getFullYear();
        const month = group.createDate.getMonth() < 9 ? '0' + (1 + group.createDate.getMonth()) : 1 + group.createDate.getMonth();
        const day = group.createDate.getDate() < 10 ? '0' + group.createDate.getDate() : group.createDate.getDate();
        const hour = group.createDate.getHours() < 10 ? '0' + group.createDate.getHours() : group.createDate.getHours();
        const minute = group.createDate.getMinutes() < 10 ? '0' + group.createDate.getMinutes() : group.createDate.getMinutes();
        const seconds = group.createDate.getSeconds() < 10 ? '0' + group.createDate.getSeconds() : group.createDate.getSeconds();
        const newFilename = `${folder}/${hour}.${minute}.${seconds} Uhr`.replace('Sonnenbühl', 'Nebelhöhle');

        const alternativeFilename = `${alternativeFolder}/${hour}.${minute}.${seconds} Uhr`.replace('Sonnenbühl', 'Nebelhöhle');
        console.log('closest to ' + group?.jpg + ': ' + JSON.stringify(closest));
        console.log(newFilename);
        const originalFolder = `${dir}/original/${year}/${month}/${day}`;
        if (!commands.includes(`mkdir -p "${originalFolder}"`)) {
          if (!fs.existsSync(originalFolder)) {
            commands.push(`mkdir -p "${originalFolder}"`);
          }
        }
        if (!commands.includes(`mkdir -p "${folder}"`)) {
          if (!fs.existsSync(folder)) {
            commands.push(`mkdir -p "${folder}"`);
          }
        }
        if (!commands.includes(`mkdir -p "${alternativeFolder}"`)) {
          if (!fs.existsSync(alternativeFolder)) {
            commands.push(`mkdir -p "${alternativeFolder}"`);
          }
        }

        const originalFilename = group.heic || group.jpg || group.mov;
        const byDateFilename = `${dir}/original/${year}/${month}/${day}/${originalFilename}`.replace('.HEIC', '').replace('.JPG', '');

        if (group.heic) {
          if (!fs.existsSync(`${byDateFilename}.HEIC`)) {
            commands.push(`mv "${group.folder}/${group.heic}" "${byDateFilename}.HEIC"`);
          }
          if (!fs.existsSync(`${newFilename}.HEIC`)) {
            commands.push(`ln -s "${byDateFilename}.HEIC" "${newFilename}.HEIC"`);
          }
          if (!fs.existsSync(`${alternativeFilename}.HEIC`)) {
            commands.push(`ln -s "${byDateFilename}.HEIC" "${alternativeFilename}.HEIC"`);
          }
        }
        if (group.jpg) {
          if (!fs.existsSync(`${byDateFilename}.JPG`)) {
            commands.push(`mv "${group.folder}/${group.jpg}" "${byDateFilename}.JPG"`);
          }
          if (!fs.existsSync(`${newFilename}.JPG`)) {
            commands.push(`ln -s "${byDateFilename}.JPG" "${newFilename}.JPG"`);
          }
          if (!fs.existsSync(`${alternativeFilename}.JPG`)) {
            commands.push(`ln -s "${byDateFilename}.JPG" "${alternativeFilename}.JPG"`);
          }
        }
        if (group.mov) {
          if (!fs.existsSync(`${byDateFilename}.MOV`)) {
            commands.push(`mv "${group.folder}/${group.mov}" "${byDateFilename}.MOV"`);
          }
          if (!fs.existsSync(`${newFilename}.MOV`)) {
            commands.push(`ln -s "${byDateFilename}.MOV" "${newFilename}.MOV"`);
          }
          if (!fs.existsSync(`${alternativeFilename}.MOV`)) {
            commands.push(`ln -s "${byDateFilename}.MOV" "${alternativeFilename}.MOV"`);
          }
        }
        if (group.aae) {
          if (!fs.existsSync(`${byDateFilename}.AAE`)) {
            commands.push(`mv "${group.folder}/${group.aae}" "${byDateFilename}.AAE"`);
          }
          if (!fs.existsSync(`${newFilename}.AAE`)) {
            commands.push(`ln -s "${byDateFilename}.AAE" "${newFilename}.AAE"`);
          }
          if (!fs.existsSync(`${alternativeFilename}.AAE`)) {
            commands.push(`ln -s "${byDateFilename}.AAE" "${alternativeFilename}.AAE"`);
          }
        }
      } else {
        console.log("Couldn't find closest to " + JSON.stringify(group));
      }
    }
  });
}

async function doIt() {
  if (fs.existsSync('./.moveAndRename.sh')) {
    fs.unlinkSync('./.moveAndRename.sh');
  }
  const fileGroups = await collectFiles(dir);

  await findDuplicates(fileGroups);
  console.log(fileGroups.length + ' groups to process');
  fs.writeFileSync('./.collected-files.json', JSON.stringify(fileGroups));

  let counter = 0;
  for (let group of fileGroups) {
    try {
      await moveAndRenameFile(group);
    } catch (exception) {
      console.log('Error', exception);
      console.log(JSON.stringify(group));
      process.exit();
    }
    counter++;
    if (counter % 100 === 0) {
      console.log(counter + ' of ' + fileGroups.length + ' finished (' + Math.round((counter * 100) / fileGroups.length) + '%)');
    }
  }
  fs.writeFileSync('./.collected-files-with-date.json', JSON.stringify(fileGroups));

  findImagesWithSimilarDate();

  console.log(commands.length + ' file commands');
  const commandFile = commands.join('\n');
  fs.writeFileSync('./.moveAndRename.sh', commandFile);
}

if (!fs.existsSync(`${dir}/.cache`)) {
  fs.mkdirSync(`${dir}/.cache`);
}

doIt();
