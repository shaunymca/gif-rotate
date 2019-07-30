// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();
const path = require('path');
var formidable = require('formidable');
var fs = require('fs');
var Jimp = require('jimp');
const { BitmapImage, GifFrame, GifUtil, GifCodec } = require('gifwrap');

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

var done = function(rotatedFile, frames) {
  return new Promise(function(resolve, reject) {
    console.log('creating the gif from the frames \n frames in gif:');
    console.log(frames.length);
    GifUtil.quantizeDekker(frames, 256)
    GifUtil.write(rotatedFile, frames, { loops: 0 }).then(gif => {
      console.log("written");
      resolve(rotatedFile)
    });
  })
}

var rotator = function(file, r) {
  return new Promise(function(resolve, reject){
    file.clone((err,clone) => {
      clone.rotate(r, false, (err, rotated) => {
        resolve(rotated);
      })               
    })
    
  })
}

var gifmaker = function(inputFileLocation) {
  return new Promise(function(resolve, reject) {
    var dir = path.dirname(inputFileLocation)
    var rotatedFile = "./files/rotated.gif";
    var frames = [];
    let r = 0
    console.log("Starting rotation of emoji")
    Jimp.read(inputFileLocation)
    .then(function(image) {
      frames.push(new GifFrame(new BitmapImage(image.bitmap)))
      for (var i = 0; i < 14; i++) {
        r = r - 24
        rotator(image,r).then(function(rotated) {
          const frame = new GifFrame(new BitmapImage(rotated.bitmap))
          frames.push(frame);
          if (frames.length > 14 ) {
            done(rotatedFile, frames).then(function(giflocation) {
              resolve(giflocation);
            });
          }
        })
      }
    })                 
  });
};


app.post('/fileupload', function(request, response) {
  var form = new formidable.IncomingForm();
  form.parse(request, function (err, fields, files) {
    var oldpath = files.filetoupload.path;
    var newpath = './files/' + files.filetoupload.name;
    fs.readFile(oldpath, function (err, data) {
      if (err) throw err;
        console.log('File read!');

      // Write the file
      fs.writeFile(newpath, data, function (err) {
        if (err) throw err;
        console.log('Local upload written!');
        console.log(newpath);

        gifmaker(newpath).then(function(giflocation) {
          var file = fs.createReadStream(giflocation);
          file.on('end', function() {
            fs.unlink(giflocation, function() {
              console.log('Gif file deleted!');
            });
            fs.unlink(newpath, function (err){
              if (err) throw err;
              console.log('All Files deleted!');
            })
          });
          file.pipe(response);
          //response.download(giflocation);
        });
      });

      // Delete the file
      fs.unlink(oldpath, function (err) {
          if (err) throw err;
          console.log('Original upload deleted');
      });
    });
  });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
