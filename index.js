const fs = require('fs');
const openstreetmap = require('./openstreetmap');

const dir = '/Users/stephan/Dropbox/Photos/2019/Frankreich und Spanien'; // TODO put your image folder here

let folder = [
  '2019-09-14 Autun abends',
  '2019-09-15 Autun',
  '2019-09-16 Cluny',
  '2019-09-16 Le Puy en Velay Lumiere',
  '2019-09-17 Le Puy en Velay und Umgebung',
  '2019-09-18 Castelnau-Pégayrols und Millau',
  '2019-09-19 Cité de Pierres',
  '2019-09-19 Millau nachts',
  '2019-09-20 Col d´Aspin Lourdes und Laruns',
  '2019-09-21 Parc National de Pyrenees',
  '2019-09-22 Pamplona',
  '2019-09-23 Navarra',
  '2019-09-24 Olite und Parque Natural de Bardenas',
  '2019-09-25 Ordesa',
  '2019-09-26 San Juan de la Peña',
  '2019-09-27 Santuario',
  '2019-09-28 Aínsa',
  '2019-09-29 Parque Natural de la Sierra y los Cañones de Guara',
  '2019-09-30 Geoparque de Sobrarbe',
  '2019-10-01 Vielha und katalanische Pyrenäen',
  '2019-10-02 Ainsa und Bielsa',
  '2019-10-02 Dune de Pylat',
  '2019-10-03 Bordeaux'
];

async function renameFolder(folderOrFile) {
  if (fs.statSync(folderOrFile).isFile()) {
    await openstreetmap.addInfoToFilename(folderOrFile);
  } else if (!folder.includes('.DS_Store')) {
    const files = fs.readdirSync(folderOrFile);
    for (var file of files) {
      await openstreetmap.addInfoToFilename(folderOrFile + '/' + file);
    }
  }
}

async function renameBatch(f) {
  const folders = fs.readdirSync(dir);
  for (folder of folders) {
    if (!folder.startsWith('.'))  {
      await renameFolder(dir + '/' + folder);
    }
  }
}

renameBatch();
