# Organizing your iPhone photo collections automagically

I love traveling! After each journey, I end up with countless photographies and too little time to sort them. So I wrote a program for that. Over the years, the project became more ambitious. This repositor contains the approaches of 2018, 2019, and 2021.
# Take 1: renaming JPG images

In 2018, I've implemented a little node.js utility extracting some data from the embedded EXIF metadata:

- the village
- the focal length (converted to the 35 millimeters format)
- the ISO value
- the height above sea level
- the exposure time

The idea is to combine these data to a new filename. The utility renames every JPG file in a folder.

## Usage

You need to install npm first. Once you've done that,

- open a terminal
- `cd "2018 rename-jpg-only"`
- edit the index.js. Scan for the text "<your image folder>" and replace it with the fully qualified path name of your image folder. Currently, that's line 4.
- `npm install`
- `node index.js`
- The latter command dumps a list of planned changes to the console window. Review the changes.
- Make a backup of your image folder, just in case. After running the utility there's no way back.
- If you agree with the changes, edit the file `openstreetmap.js`. Uncomment the two lines containg the command `fs.renameSync`.
- Run `node index.js` again.

# Take 2: Using HEIC instead of JPG

In 2019, I discovered the HEIC format. It's more compact than JPG, so it was logical to adopt it. At the time, there were few npm libraries to read EXIF data from *.heic files, so I took the code I found at https://github.com/exif-heic-js/exif-heic-js and included it into my own code.

## Usage
This utility works pretty much the same way as its 2018 predecessor. The only difference (apart from allowing both *.jpg and *.heic files) is I'd already grouped my images into subfolders. Now you know where I spend my last pre-Corona vacations!

- open a terminal
- `cd "2019 manually-implemented-heic-exif-reader"`
- edit the index.js. Scan for the text "<your image folder>" and replace it with the fully qualified path name of your image folder. Currently, that's line 4.
- edit the list of subfolders so it matches your file system. If you don't have subfolders, comment the last line and uncomment the second last line. Currently, that's lines 53 and 52.
- `npm install`
- `node index.js`
- The latter command dumps a list of planned changes to the console window. Review the changes.
- Make a backup of your image folder, just in case. After running the utility there's no way back.
- If you agree with the changes, edit the file `openstreetmap.js`. Uncomment the two lines containg the command `fs.renameSync`.
- Run `node index.js` again.

# Take 3: Moving the files to two folder structures grouped by date and region (plus keep a folder of the original files)

In 2021, I discovered how to transfer the "live photos" from the iPhone to a MacBook, so I decided to copy all 5500 of my iPhone to a new "live images" folder on my dropbox. That's several years of pictures, so the utility now moves the images to folders automatically.

Now the utlity has these key features:
- It extracts EXIF data from JPG, MOV, and HEIC images and renames the images based on the EXIF data.
- It builds three folder structures:
  - The `original` folder contains the original files, grouped into date folders. The files are moved into these folders, but they keep their original filename.
  - The `chronological` folder is also organized by date, but it also added subfolders for the countries. The "day" folders also contain the name of the city. The file names contain the time, the focal length, the exposure time, the ISO value, and the altitude above sea level.
  - The `by region` folder is grouped by country, regio, and city. So the date is added to the file name.
- The folders `chronological` and `by region` contain symbolic links pointing to the corresponding file in the `original` folders. Caveat: if you move a file in the `original` folder, the symbolic links are broken.
- If a file doesn't contain GPS data (for example, because you've taken the image in a cave), it tries to guess the GPS data from a picture taken shortly before or after.
- The utility is prepared for iPhone live images. It considers *.HEIC, *.JPG, *.MOV, and *.AAE files with the same name as a group. Every file of the group is moved to the same folder and get the same filename (apart from the extension).
- The utility also detects duplicate files (based on the md5 hash). If the file name is similar enough, it suggests to delete one of the copies.

## Usage

- Use the "image capture" app to upload your iPhone images to a folder. (That's the only way I know to get the *.MOV files that make the "live" aspect of the image).
- open a terminal
- `cd "2021 organize-iPhone-live-images-into-folders"`
- edit the index.js. Scan for the text "<your image folder>" and replace it with the fully qualified path name of your image folder. Currently, that's line .
- `npm install`
- `node index.js`. If you run the command for the first time, it may take a while. Getting the GPS information from OpenStreetMap takes roughly a second.
- The latter command dumps a list of of the duplicate files to the console window. Review the list.
- Make a backup of your image folder, just in case. After running the utility there's no way back.
- If you want to delete the duplicate files, 
  - edit the file `file-collector.js`. Uncomment the lines containg the command `fs.unlinkSync`. Currently, that's line 126.
  - Run `node index.js` again.
- The project folder (i.e. `.../2021 organize-iPhone-live-images-into-folders/`) now contains a file called `.moveAndRename.sh`. That's a shell file containing all the file operations to build the folder structure and to rename the files.
  - Note that this is a MacOS shell script. If you're using Unix, you may neeed to modify it. If you're using Windows,
    - replace `mv ` by `move `
    - replace the forward slashes by backslashes
    - replace `ln -s ` by `mklink `
  - If you prefer hard links over soft links, replace `ln -s ` by `ln ` (or `mklink /H ` if you're using Windows).
  - Also have a look at the end of the file, starting with the key word "guesswork". This section deals with the images without GPS information. Verify if the utility guesses correctly.
  - Run the script with `sh ./.moveAndRename.sh`.
- Your image folder now contains a folder `.cache`. This folder caches the locations of the GPS locations. It allows you to re-run the utility much faster than the first run. If you're finished, delete the folder.
  