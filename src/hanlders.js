const fs = require('fs');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const dbfunctions = require('./db_functions.js');
const validation = require('./validation.js');
const {insertTweet, getAllTweetFromDB, getUser} = require('./db_functions.js');

function genaricHandler (req, res) {
  let url = req.url;
  if (url === '/') {
    url = 'index.html';
  } else if (url === '/home') {
    url = 'home.html';
  }
  let parts = url.split('.');
  const fileExtention = parts[parts.length - 1];
  const contentTypes = {
    css: 'text/css',
    html: 'text/html',
    js: 'application/javascript',
    ico: 'image/x-icon',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'

  };
  fs.readFile(`${__dirname}/../public/${url}`, (err, data) => {
    if (err) {
      fs.readFile(`${__dirname}/../public/404.html`, 'utf-8', (err2, data2) => {
        if (err2) {
          res.writeHead(500, {'Content-Type': 'text/html'});
          res.end('<h1>500 , Server Error</h1>');
        } else {
          res.writeHead(404, {'Content-Type': 'text/html'});
          res.end(data2);
        }
      });
    } else {
      res.writeHead(200, {
        'Content-Type': contentTypes[fileExtention]
      });
      res.end(data);
    }
  });
}

function loginHandler (req, res) {
  let loginData = '';
  req.on('data', (chunk) => {
    loginData += chunk;
  });
  req.on('end', () => {
    loginData = JSON.parse(loginData); console.log(loginData.username);
    validation.loginValidation(loginData.username, loginData.password, (error, result) => {
      if (error || result.msg !== '') {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(result.msg);
      } else {
        let token = jwt.sign({userName: result.userRes}, 'twitter shhh');
        res.writeHead(200, {'Set-Cookie': [
          `user=${result.userRes};`,
          `avatar=${result.avatar};`,
          `token=${token};`
        ]});
        res.end('');
      }
    });
  });
  req.on('error', () => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Connection Error');
  });
}

function signupHandler (req, res) {
  let signupData = '';
  req.on('data', (chunk) => {
    signupData += chunk;
  });
  req.on('error', () => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Connection Error');
  });
  req.on('end', () => {
    signupData = JSON.parse(signupData);
    console.log('signupData', signupData);
    validation.signupValidation(signupData, (error, result) => {
      if (error || result.msg !== '') {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(result.msg);
      } else {
        var token = jwt.sign({userName: result.userRes}, 'twitter shhh');
        res.writeHead(200, {'Set-Cookie': [
          `user=${result.userRes};`,
          `avatar=${result.avatar};`,
          `token=${token};`
        ]});
        res.end('');
      }
    });
  });
}
function getProfileInfoHandler (req, res, username) {
  dbfunctions.profileInfo(username, (err, ress) => {
    if (err) {
      res.writeHead(500, {'Content-Type': 'text/html'});
      res.end('<h1>500 , Server Error</h1>');
    } else {
      res.writeHead(200);
      res.end(JSON.stringify(ress[0]));
    }
  });
}

function getProfileTweetsHandler (req, res, username) {
  dbfunctions.profileTweets(username, (err, ress) => {
    if (err) {
      console.log(err);
      res.writeHead(500, {'Content-Type': 'text/html'});
      res.end('<h1>500 , Server Error</h1>');
    } else {
      res.writeHead(200);
      res.end(JSON.stringify(ress));
    }
  });
}

function createtweet (req, res) {
  const token = cookie.parse(req.headers.cookie).token;
  jwt.verify(token, 'twitter shhh', function (err, user) {
    if (err) {
      res.writeHead(401, {'Content-Type': 'text/html'});
      res.end('<center><h2>Un authorized request </h2></center>');
    }
    let username = user.userName;
    let tweetText = '';
    req.on('data', (chunk) => {
      tweetText += chunk;
    });
    req.on('end', () => {
      // should get response in this format ={ status : ' ' , ownerName:' ',tweetText:'',avatarUrl: 'http://someLinke!' ,errorMsg:''}
      insertTweet(username, tweetText, (err, resObj) => {
        if (err) {
          let obj = {};
          obj.status = false;
          obj.errorMessage = err;
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(obj));
        } else {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(resObj));
        }
      });
    });
  });
}
function getalltweets (req, res) {
  getAllTweetFromDB((err, tweets) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({status: false, errorMsg: err}));
    } else {
      // { tweetNumber : 10 , tweets:[t1:{tweetText:' ' , ownerName:'' , avatarUrl},t2 ,t3]}
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(tweets));
    }
  });
}
function getuserData (req, res) {
  const token = cookie.parse(req.headers.cookie).token;

  jwt.verify(token, 'twitter shhh', function (err, user) {
    if (err) {
      res.writeHead(401, {'Content-Type': 'text/html'});
      res.end('<center><h2>Un authorized request </h2></center>');
    } else {
      getUser(user.name, (err, userDetails) => {
        // { status: false , errorMsg:'' , username:'' , avatar:''}
        if (err) {
          res.writeHead(404, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({status: false, errorMsg: err}));
        } else {
          const user = {
            username: userDetails.username,
            avatar: userDetails.avatar,
            status: true,
            errorMsg: ''
          };
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(user));
        }
      });
    }
  });
}

function checkToken (req, res, handlerEx) {
  const token = cookie.parse(req.headers.cookie).token;
  jwt.verify(token, 'twitter shhh', function (err, user) {
    if (err) {
      res.writeHead(401, {'Content-Type': 'text/html'});
      res.end('<center><h2>Un authorized request </h2></center>');
    } else {
      handlerEx(req, res);
    }
  });
}
module.exports = {
  genaricHandler,
  loginHandler,
  signupHandler,
  getProfileInfoHandler,
  getProfileTweetsHandler,
  createtweet,
  getuserData,
  getalltweets,
  checkToken
};
