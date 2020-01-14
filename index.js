var express = require('express');
var favicon = require('serve-favicon');
var path = require('path');
var fs = require('fs');

var app = express()
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

// https://pugjs.org/api/getting-started.html
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

// Add your routes here, etc.
app.get('/', function (req, res) {
  fs.readFile(path.join(__dirname, 'data', 'CoordNm.java'), 'utf8', function(err, contents) {
      res.render('index', { title: 'CoordNm.java', message: contents })
    });
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})
