// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const express = require("express");
const app = express();

const cors = require('cors');
app.use(cors());

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

const session = require('express-session');
var cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(session({secret: "Shh, its a secret!", resave: true, saveUninitialized: true}));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});
app.get("/added.html", (request, response) => {
  response.sendFile(__dirname + "/views/added.html");
});
app.get("/admin.html", (request, response) => {
  response.sendFile(__dirname + "/views/admin.html");
});
app.get("/login.html", (request, response) => {
  response.sendFile(__dirname + "/views/login.html");
});
app.get("/saved.html", (request, response) => {
  response.sendFile(__dirname + "/views/saved.html");
});

const fs = require("fs");
const builder = require("xmlbuilder");
const convert = require('xml-js');

const generateString = length => {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

app.post("/add", (req, res) => {
  // Checking for Necessary fields
  if (req.body.hasOwnProperty('field-name')
     && req.body.hasOwnProperty('field-email')
     && req.body.hasOwnProperty('field-birthday')
     && req.body.hasOwnProperty('field-gender')
     && req.body.hasOwnProperty('field-select-powers')
     && req.body.hasOwnProperty('field-name-1')
     && req.body.hasOwnProperty('check-1')) {
    
    const login = generateString(5);
    const password = generateString(8);
    
    // Creating xml from a request body
    const xml = builder.create({root: { ...req.body, login, password }}).end({ pretty: true });
    const xmlName = login; // name generation using a accessory function
    
    // Saving xml
    fs.writeFile(`./xmls/${xmlName}.xml`, xml, function(err) {
      if (err) throw err;
      console.log("Saved!");
    });

    // Sending response
    // res.json({
    //   success: true,
    //   xml_name: xmlName
    // });
    res.render('./added.html', {login, password});
    return;
  } else {
    // Necessary fields aren't complete
    // There's detection of empty field
    console.log(req.body);
    if (!req.body.hasOwnProperty('field-name'))
      console.log('name');
    
    if (!req.body.hasOwnProperty('field-email'))
      console.log('email');
    
    if (!req.body.hasOwnProperty('field-birthday'))
      console.log('birthday');
    
    if (!req.body.hasOwnProperty('field-gender'))
      console.log('gender');
    
    if (!req.body.hasOwnProperty('field-select-powers'))
      console.log('powers');
    
    if (!req.body.hasOwnProperty('field-name-1'))
      console.log('name-1');
    
    if (!req.body.hasOwnProperty('field-check-1'))
      console.log('check-1');
    
    // Redirect back
    const backURL = req.header('Referer') || '/';
    res.redirect(backURL);
  }
});

// Credentials
const auth = {login: 'admin', password: '123'};

const isAdmin = req => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

  // Verify login and password are set and correct
  if (login && password && login === auth.login && password === auth.password) {
    return true;
  }
  return false;
}

const getFilesContent = () => {
  const files = fs.readdirSync('./xmls');
  console.log(files);
  const filesContent = []
  files.forEach(filename => {
    const xml = fs.readFileSync(`./xmls/${filename}`,'utf8');
    const parsed = JSON.parse(convert.xml2json(xml, { ignoreDeclaration: true })).elements[0].elements;
    const data = {
      'file-name': filename,
      'field-name': parsed[0].elements[0].text,
      'field-email': parsed[1].elements[0].text,
      'field-birthday': parsed[2].elements[0].text,
      'field-gender': parsed[3].elements[0].text,
      'field-select-powers': parsed[4].elements[0].text,
      'field-name-1': parsed[5].elements[0].text,
      'check-1': parsed[6].elements[0].text,
    }
    filesContent.push(data);
  });
  return filesContent;
}

app.post("/admin", (req, res) => {
  if (isAdmin(req)) {
    // Access granted...
    const filesContent = getFilesContent();
    res.json({
      success: true,
      files_content: filesContent
    });
    return;
  } else {
    // Access denied...
    res.set('WWW-Authenticate', 'Basic realm="401"')
    res.status(401).send('Authentication required.')
  }
  return;
});

app.post("/delete", (req, res) => {
  if (isAdmin(req)) {
    // Access granted...
    fs.unlink(`./xmls/${req.body.filename}`, (err) => {
      if (err) {
        console.error(err)
        return
      }

      //file removed
      console.log(req.body.filname, "deleted!")
    });
    
    // Redirect back
    const backURL = req.header('Referer') || '/';
    res.redirect(backURL);
  } else {
    // Access denied...
    res.set('WWW-Authenticate', 'Basic realm="401"')
    res.status(401).send('Authentication required.')
  }
});

app.post("/login", (req, res) => {
  const files = fs.readdirSync('./xmls');
  if (files.includes(req.body.username + '.xml')) {
    const filename = req.body.username + ".xml";
    const xml = fs.readFileSync(`./xmls/${filename}`,'utf8');
    const parsed = JSON.parse(convert.xml2json(xml, { ignoreDeclaration: true })).elements[0].elements;
    const password = parsed[8].elements[0].text;
    if (req.body.password == password) {
      req.session.login = filename;
      req.session.password = password;
      const data = {
        // 'filename': filename,
        'fieldName': parsed[0].elements[0].text,
        'fieldEmail': parsed[1].elements[0].text,
        'fieldBirthday': parsed[2].elements[0].text,
        'fieldGender': parsed[3].elements[0].text,
        'fieldSelectPowers': parsed[4].elements[0].text,
        'fieldName1': parsed[5].elements[0].text
      }
      console.log("hey");
      res.render('./edit.html', { ...data });
      return;
    }
  }
  return;
});

app.post("/edit", (req, res) => {
  // Creating xml from a request body
  const xml = builder.create({root: { ...req.body, check1: "on", login: req.session.login, password: req.session.password }}).end({ pretty: true });

  // Saving xml
  fs.writeFile(`./xmls/${req.session.login}`, xml, function(err) {
    if (err) throw err;
    console.log("Saved!");
  });

  res.render('./saved.html');
  return;
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
