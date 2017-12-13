"use strict";

var async = require('async');
var session = require('express-session');
var bodyParser = require('body-parser');
var fs = require("fs");
var express = require('express');
var app = express();
var mongoose = require('mongoose');
var ObjectId = require('mongoose').Types.ObjectID;
var Twitter = require('twitter');
var PythonShell = require('python-shell');
var spawn = require("child_process").spawn;
var fs = require('fs');
var states;
fs.readFile('data/states.json', 'utf8', function (err, data) {
  if (err) throw err;
  states = JSON.parse(data);
});
var client= new Twitter({
          consumer_key: '59ikgjRLXfO4RiUYxa1Asbqjt',
          consumer_secret: 'ponflj7Hi3fdQ9XPdVKYzJFB9Z42LOMyANAx4bvMz5oE3Fb3hi',
          access_token_key: '30604803-RwIqQ3yjQgQzEAYkzcxBtfIgQyYgIyZ1V1Ww0qllJ',
          access_token_secret: 'BwfGYtZD8SVmflT2ckduCHMSqjdcuvP5oiXmC8MuvzsTC'
        });
var mongo = require('mongodb');
 
var mdbServer = mongo.Server('localhost', 27017, {'auto_reconnect' : true});
var mdb = mongo.Db('streaming_db', mdbServer);
mdb.open(function (err, db) {
      client.stream('statuses/filter', {track: 'bernie, bernie sanders, @BernieSanders, hillary, hillary clinton, @HillaryClinton, trump, donald trump, @realDonaldTrump'}, function(stream) {
  stream.on('data', function(tweet) {
  if(tweet.place != null) {
      var process = spawn('python',["sentimentanalysis.py", tweet.text]);
      process.stdout.on('data', function (data) {
      data = data.toString('utf8');
      var jsonData = JSON.parse(data);
      if(jsonData.polarity != 0.0) {
      var place = null;
      console.log(tweet);
      for(var i = 0; i < states.length;i++) {
        if(tweet.place.full_name.indexOf(states[i].name) != -1 || tweet.place.full_name.indexOf(states[i].abbreviation) != -1) {
          place = states[i];
          break;
        }
      }
      if(place != null) {


      var mongoTweet = {
        text: tweet.text,
        state: place,
        user: tweet.user.name,
        screenname: tweet.user.screen_name,
        place_name: tweet.place.name,
        coordinates: tweet.place.bounding_box.coordinates,
        sentiment: data
      };
      var collection = 'misc';
      if(tweet.text.toLowerCase().indexOf('bernie') != -1) {
        collection = 'Sanders';
      } else if(tweet.text.toLowerCase().indexOf('hillary') != -1) {
        collection = 'Clinton';
      } else if(tweet.text.toLowerCase().indexOf('trump') != -1) {
        collection = 'Trump';
      }
      mdb.collection(collection, function(err, collection) {
               collection.insert({'tweet': mongoTweet, safe:true}
                                 , function(err, result) {
                                  console.log(result);
                                 });
              });
    }

    }
    });
  }
});
});
});

var OAuth= require('oauth').OAuth;
var server = app.listen(8080, function () {
    var port = '3000';
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});
var io = require('socket.io').listen(server);
var oa = new OAuth(
  "https://api.twitter.com/oauth/request_token",
  "https://api.twitter.com/oauth/access_token",
  'K88QTsj30mPqaMILCAuH7gWo9',
  'cSzyKhn5EtsnZCi1Aut4LE7vvpJYKVTiJVRKxqDh7lukoHXQxw',
  "1.0",
  "http://127.0.0.1:3000/auth/twitter/callback",
  "HMAC-SHA1"
);
app.use(session({secret: '357d0cda12cb90a344f0048244901ef9', resave: false, saveUninitialized: false}));
var MongoStore = require('connect-mongo')(session);
app.use(session({
 store: new MongoStore({ mongooseConnection: mongoose.connection })
}));
app.use(bodyParser.json());
app.use(express.static(__dirname));

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('search', function(msg){
    var searchTerm = JSON.parse(msg).searchTerm
    client.stream('statuses/filter', {track: 'bernie, hillary, trump'}, function(stream) {
  stream.on('data', function(tweet) {
  if(tweet.place != null) {
      var process = spawn('python',["sentimentanalysis.py", tweet.text]);
      process.stdout.on('data', function (data) {
      data = data.toString('utf8'); 
      socket.emit('tweetData', JSON.stringify({text: tweet.text, user: tweet.user.name, screenname: tweet.user.screen_name, place: tweet.place, sentiment: data}));
    });
      }
    });
 
  stream.on('error', function(error) {
    throw error;
  });
});
  });
});


app.get('/auth/twitter', function(req, res){
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if (error) {
      console.log(error);
      res.send("Login attempt failed.");
    }
    else {
      req.session.oauth = {};
      req.session.oauth.token = oauth_token;
      console.log('oauth.token: ' + req.session.oauth.token);
      req.session.oauth.token_secret = oauth_token_secret;
      console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
      res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token);
  }
  }); 
});
app.get('/auth/twitter/callback', function(req, res, next){
  if (req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth = req.session.oauth;

    oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
    function(error, oauth_access_token, oauth_access_token_secret, results){
      if (error){
        console.log(error);
        res.send("yeah something broke.");
      } else {
        client = new Twitter({
          consumer_key: 'K88QTsj30mPqaMILCAuH7gWo9',
          consumer_secret: 'cSzyKhn5EtsnZCi1Aut4LE7vvpJYKVTiJVRKxqDh7lukoHXQxw',
          access_token_key: oauth_access_token,
          access_token_secret: oauth_access_token_secret
});
        req.session.oauth.access_token = oauth_access_token;
        req.session.oauth.access_token_secret = oauth_access_token_secret;
        console.log(results);
        res.redirect('http://127.0.0.1:3000');
      }
    }
    );
  } else
    next(new Error("You are not authorized to view this page."));
});

 