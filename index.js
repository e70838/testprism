var express = require('express');
var favicon = require('serve-favicon');
var path = require('path');
var fs = require('fs');
var readline = require('readline');

// read all tasks
var all_tasks = {};
let rl = readline.createInterface({
    input: fs.createReadStream(path.join(process.env.REPO, 'all_task.csv'))
});
rl.on('line', function (line) {
    const [full_match, num, version, synopsis] = line.match(/^([^;]+);([^;]+);(.*)$/);
    all_tasks[num] = {Version: version, Synopsis: synopsis, Objects: new Array()};
});
rl.on('close', function(line) {
    console.log('fini');
    let rl2 = readline.createInterface({
       input: fs.createReadStream(path.join(process.env.REPO, 'all_obj.csv'))
    });
    rl2.on('line', function (line) {
        const [objectname, state, author, release, tasks, time] = line.split(';');
        const obj = {Objectname: objectname, State: state, Author: author, Release: release, Time:time};
        tasks.split(',').forEach(function(item, index) {
            if (all_tasks.hasOwnProperty(item)) {
                all_tasks[item].Objects.push(obj);
            } else if ('<void>'.localeCompare(item)) {
                console.log('task ' + item + ' not found');
            }
        });
    });
    rl2.on('close', function(line) {
        console.log('Really fini');
    });
});

// associate synergy file types to highlighter
const knownLang = {java: 'language-java',
                   adabody: 'language-ada',
                   adaspec: 'language-ada', 
                   adasrc: 'language-ada',
                   ascii: 'language-bash',
                   'c++': 'language-cpp',
                   csrc: 'language-bash',
                   html: 'language-markup',
                   incl: 'language-cpp',
                   makefile: 'language-makefile',
                   perl: 'language-perl',
                   shsrc: 'language-bash',
                   txt: 'language-bash'};

// server
var app = express()
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

// https://pugjs.org/api/getting-started.html
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

// Add your routes here, etc.
// task list
app.get('/', function (req, res) {
    res.render('tasks', { repo: process.env.REPO, tasks: all_tasks })
})

// get content of an object
app.get('/obj/:id', function (req, res) {
    const {type, name, instance, version} = parse_object_name(req.params.id);
    if ('project'.localeCompare(type) === 0) {
        res.render('project', {title: req.params.id, message: recRead(path.join(process.env.REPO, type, name, instance, version))});
    } else {
        const lang = knownLang[type] || 'language-none';
        const data = path.join(process.env.REPO, type, name, instance, version, 'content');
        fs.readFile(data, 'utf8', function(err, contents) {
            if (err)
                res.render('notfound', {title: req.params.id, message: err});
            else
                res.render('highlight', { title: req.params.id, message: contents, lang: lang })
        });
    }
})

// helper function to display a project
const recRead = (objectnamethePath) => {
    return fs.readFileSync(path.join(objectnamethePath, 'ls')).toString().split('\n').map(x => {
        if (x.length == 0) return ''; // skip blank lines
        const {type, name, instance, version} = parse_object_name(x);
        // recurse into dirs
        if ('dir'.localeCompare(type) === 0) {
            return '<li><span class="folder"><a href="/obj/' + escape(x)+ '">' + x + '</a></span><ul>' + recRead(path.join(objectnamethePath, name)) + '</ul></li>';
        } else {
            return '<li><span class="file"><a href="/obj/' + escape(x)+ '">' + x + '</a></span></li>';
        }
        }).join('\n');
};

// get raw content of an object
app.get('/raw/:id', function (req, res) {
    const {type, name, instance, version} = parse_object_name(req.params.id);
    const data = path.join(process.env.REPO, type, name, instance, version, 'content');
    const rs = fs.createReadStream(data);
    rs.on('error', function(error) {
        res.render('notfound', {title: req.params.id, message: err});});
    res.statusCode = '200';
    // ??res.setHeader('Content-Type', '');
    rs.pipe(res);
})

// get history of an object
app.get('/hist/:id', function (req, res) {
    const {type, name, instance, version} = parse_object_name(req.params.id);
    const data = path.join(process.env.REPO, type, name, instance, version, 'hist');
    fs.readFile(data, 'utf8', function(err, contents) {
        if (err)
            res.render('notfound', {title: req.params.id, message: err});
        else
            res.render('history', { title: req.params.id, message: contents })
    });
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})

// helper function convert an object_name to its parts
const parse_object_name = (objectname) => {
    // extract fourth part: instance
    const ri = objectname.lastIndexOf(':');
    if (ri === -1) throw `wrong objectname ${objectname} does not contain : before instance`;
    const instance = objectname.substring(ri + 1);

    // extract third part: type
    const cri = objectname.lastIndexOf(':', ri - 1);
    if (cri == -1) throw `wrong objectname ${objectname} does not contain : before type`;
    const ctype = objectname.substring(cri + 1, ri);

    // extract second part: version
    let vri = objectname.lastIndexOf(':', cri - 1);
    if (vri === -1) {
        vri = objectname.lastIndexOf('-', cri - 1);
    }
    if (vri === -1) throw `wrong objectname ${objectname} does not contain : or - before version`;
    const version = objectname.substring(vri + 1, cri);

    // first part: name
    const name = objectname.substring(0, vri);

    return {type: ctype, name: name, instance: instance, version: version};
};
