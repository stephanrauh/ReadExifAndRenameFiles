const fs = require('fs');
const openstreetmap = require('./openstreetmap');

const dir = '(your image folder)'; // TODO put your image folder here

async function renameFolder(folder) {
  if (!folder.includes('.DS_Store')) {
    const files = fs.readdirSync(folder);
    for (var file of files) {
      await openstreetmap.addInfoToFilename(folder + '/' + file);
    }
  }
}

async function renameBatch() {
  const folders = fs.readdirSync(dir);
  for (folder of folders) {
    await renameFolder(dir + '/' + folder);
  }
}

renameBatch();
