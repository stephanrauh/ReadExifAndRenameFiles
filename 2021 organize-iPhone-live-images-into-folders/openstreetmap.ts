import * as https from 'https';
import * as convert from 'xml-js';
import { sleep } from './sleep';
import * as fs from 'fs';

export interface Location {
  country: string;
  state: string;
  town: string;
}

function doGetRequest(options: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let responseAsXml = '';

      res.on('data', (chunk) => {
        responseAsXml += chunk;
      });

      res.on('end', () => {
        const resultAsJson = convert.xml2json(responseAsXml, { compact: true, spaces: 4 });
        resolve(JSON.parse(resultAsJson));
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

export async function getTown(latitude: number | undefined, longitude: number | undefined, cacheDir: string): Promise<Location> {
  if (!latitude || !longitude) {
    return {
      country: '',
      state: '',
      town: '',
    };
  }
  if (fs.existsSync(`${cacheDir}/.cache/${latitude} ${longitude}.json`)) {
    const cached = JSON.parse(fs.readFileSync(`${cacheDir}/.cache/${latitude} ${longitude}.json`).toString());
    return cached;
  }
  await sleep(100);
  var options = {
    host: 'nominatim.openstreetmap.org',
    path: '/reverse?format=xml&lat=' + latitude + '&lon=' + longitude + '&zoom=18&addressdetails=1',
    method: 'GET',
    headers: {
      referer: '(some referer)', // TODO put your referer here
      'user-agent': '(some agent)', // TODO put your agent here
    },
  };

  const geo = await doGetRequest(options);
  const country = geo.reversegeocode?.addressparts?.country._text as string | 'unknown';
  const state = geo.reversegeocode?.addressparts?.state._text as string | '';
  let town: string;
  // geo.reversegeocode.addressparts.country;
  if (geo.reversegeocode?.addressparts.town) {
    town = geo.reversegeocode?.addressparts.town._text;
  } else if (geo.reversegeocode?.addressparts.city) {
    town = geo.reversegeocode.addressparts.city._text;
  } else if (geo.reversegeocode?.addressparts.village) {
    town = geo.reversegeocode?.addressparts.village._text;
  } else if (geo.reversegeocode?.addressparts.hamlet) {
    town = geo.reversegeocode?.addressparts.hamlet._text;
  } else {
    console.error(geo);
    console.log(latitude);
    console.log(longitude);
    town = '';
    process.exit();
  }
  const result = {
    country,
    state,
    town,
  };
  console.log('got coordinates from open street map ' + latitude + ' ' + longitude + ' ' + town);

  if (geo.reversegeocode) {
    fs.writeFileSync(`${cacheDir}/.cache/${latitude} ${longitude}.json`, JSON.stringify(result));
  } else {
    console.log(geo);
  }
  return result;
}
