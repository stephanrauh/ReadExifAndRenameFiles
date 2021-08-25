import * as fs from 'fs';
import { CollectedFiles, FileGroup } from './type';
const flatten = require('lodash.flatten');
const md5File = require('md5-file');

function findMatchingFiles(folder: string, filename: string, files: Array<string>, collectedFiles: CollectedFiles): FileGroup {
  const shortName = filename.substring(0, filename.lastIndexOf('.'));
  let result = { folder } as FileGroup;

  if (files.includes(shortName + '.HEIC')) {
    result = { ...result, heic: shortName + '.HEIC' };
    collectedFiles[shortName + '.HEIC'] = true;
  }

  if (files.includes(shortName + '.JPG')) {
    result = { ...result, jpg: shortName + '.JPG' };
    collectedFiles[shortName + '.JPG'] = true;
  }
  if (files.includes(shortName + '.MOV')) {
    result = { ...result, mov: shortName + '.MOV' };
    collectedFiles[shortName + '.MOV'] = true;
  }
  if (files.includes(shortName + '.AAE')) {
    result = { ...result, aae: shortName + '.AAE' };
    collectedFiles[shortName + '.AAE'] = true;
  }
  return result;
}

export async function collectFiles(folder: string): Promise<Array<FileGroup>> {
  const collectedFiles = {} as CollectedFiles;
  if (!folder.startsWith('.')) {
    const filesAndFolders = fs
      .readdirSync(folder, { encoding: 'utf8', withFileTypes: true })
      .filter((file) => !file.name.startsWith('.'))
      .filter((file) => !file.isSymbolicLink());

    const folders = filesAndFolders.filter((file) => file.isDirectory());
    let parentFolder = folder;
    if (!parentFolder.endsWith('/')) {
      parentFolder += '/';
    }
    const nestedGroupPromises = await folders.map(async (subfolder) => await collectFiles(parentFolder + subfolder.name));
    const ng = await Promise.all(nestedGroupPromises);
    const nestedGroups = flatten(ng);
    const files = filesAndFolders
      .filter((file) => file.isFile())
      .map((file) => file.name)
      .sort();
    const fileGroups = files.map((name) => findMatchingFiles(parentFolder, name, files, collectedFiles));
    const withoutDuplicates = fileGroups.filter(
      (group, index) => index === 0 || JSON.stringify(fileGroups[index - 1]) != JSON.stringify(group)
    );
    const withoutFolders = withoutDuplicates.filter((group) => !!group.heic || group.mov || group.jpg);

    if (withoutDuplicates.length > withoutFolders.length) {
      console.log('less!' + (withoutFolders.length - withoutDuplicates.length));
    } else {
      // console.log(JSON.stringify([...fileGroups, ...withoutDuplicates]));
    }

    const notCovered = files.filter((name) => !collectedFiles[name]);

    if (notCovered.length > 0) {
      for (let file of notCovered) {
        console.log(file + ' not covered');
      }
    }
    return [...nestedGroups, ...withoutFolders];
  }
  return [];
}

export async function findDuplicates(fileGroups: Array<FileGroup>): Promise<Array<FileGroup>> {
  console.log('Looking for duplicates');
  let md5 = {} as any;
  const result = [] as Array<FileGroup>;
  const fileGroupsReverted = fileGroups.reverse();
  for (let group of fileGroupsReverted) {
    let add = true;
    if (group.heic) {
      const hash = await md5File(group.folder + group.heic);
      // console.log(group.folder + group.heic + ' ' + hash);
      if (md5[hash]) {
        console.log(group.heic + ' is a duplicate of ' + md5[hash]);
        const a = group.heic.replace('.HEIC', '');
        const b = md5[hash].replace('.HEIC', '');
        if (a.includes(b)) {
          console.log('delete' + group.folder + group.heic);
          // fs.unlinkSync(group.folder + group.heic);
        }
        add = false;
      } else {
        // console.log(group.heic + ' is not a duplicate of ' + md5[hash]);
        md5[hash] = group.heic;
      }
    }

    if (group.jpg) {
      const hash = await md5File(group.folder + group.jpg);
      // console.log(group.folder + group.heic + ' ' + hash);
      if (md5[hash]) {
        console.log(group.jpg + ' is a duplicate of ' + md5[hash]);
        const a = group.jpg.replace('.JPG', '');
        const b = md5[hash].replace('.JPG', '');
        if (a.includes(b)) {
          console.log('delete' + group.folder + group.jpg);
          // fs.unlinkSync(group.folder + group.jpg);
        }
        add = false;
      } else {
        // console.log(group.jpg + ' is not a duplicate of ' + md5[hash]);
        md5[hash] = group.jpg;
      }
    }
    if (group.mov) {
      const hash = await md5File(group.folder + group.mov);
      // console.log(group.folder + group.heic + ' ' + hash);

      if (md5[hash]) {
        console.log(group.mov + ' is a duplicate of ' + md5[hash]);
        const a = group.mov.replace('.MOV', '');
        const b = md5[hash].replace('.MOV', '');
        if (a.includes(b)) {
          console.log('delete' + group.folder + group.mov);
          // fs.unlinkSync(group.folder + group.mov);
        }
        add = false;
      } else {
        // console.log(group.mov + ' is not a duplicate of ' + md5[hash]);
        md5[hash] = group.mov;
      }
    }

    if (add) {
      result.push(group);
    }
  }

  console.log(fileGroups.length - result.length + ' duplicate files');
  return result;
}
