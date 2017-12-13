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
var Twit = require('twit')
var states;
fs.readFile('data/states.json', 'utf8', function (err, data) {
  if (err) throw err;
  states = JSON.parse(data);
});
var client = null;

var OAuth= require('oauth').OAuth;
var server = app.listen(3000, function () {
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
var stream = null;
io.on('connection', function(socket){
	console.log('a user connected');
    socket.on('close', function(msg) {
        if(stream !== null) {
            stream.stop();
            stream = null;
            console.log("stopped");
        }
    });
	socket.on('search', function(msg){
    var searchTerms = JSON.parse(msg).searchTerms;
    console.log(searchTerms);
    var trackWords = "";
    if(searchTerms.indexOf('trump') >= 0) {
    	trackWords += 'Donald Trump, trump, @realDonaldTrump';
    }
    if(searchTerms.indexOf('clinton') >= 0) {
    	trackWords += 'Hillary Clinton, clinton, @HillaryClinton';
    }
    if(searchTerms.indexOf('sanders') >= 0) {
    	trackWords += 'Bernie Sanders, sanders, @BernieSanders';
    }
    console.log(stream);
    console.log(trackWords);
    stream = client.stream('statuses/filter', {track: trackWords}); 
    
	stream.on('tweet', function(tweet) {
	if(tweet.place !== null) {
    	var process = spawn('python',["sentimentanalysis.py", tweet.text]);
    	process.stdout.on('data', function (data) {
    	data = data.toString('utf8');
        var username=null;
        var screenname=null;
        if(tweet.user) {
            username = tweet.user.name;
            screenname = tweet.user.screen_name
        }
    	socket.emit('tweetData', JSON.stringify({text: tweet.text, user: username, screenname: screenname, place: tweet.place, sentiment: data}));
    });
      }
    });
    
 
  stream.on('error', function(error) {
    console.log('Stream closed');
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
//app.get('/auth/twitter/callback', function(req, res, next){
//	if (req.session.oauth) {
//		req.session.oauth.verifier = req.query.oauth_verifier;
//		var oauth = req.session.oauth;
//
//		oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
//		function(error, oauth_access_token, oauth_access_token_secret, results){
//			if (error){
//				console.log(error);
//				res.send("yeah something broke.");
//			} else {
//				client = new Twitter({
//  				consumer_key: 'K88QTsj30mPqaMILCAuH7gWo9',
//  				consumer_secret: 'cSzyKhn5EtsnZCi1Aut4LE7vvpJYKVTiJVRKxqDh7lukoHXQxw',
//  				access_token_key: oauth_access_token,
//  				access_token_secret: oauth_access_token_secret
//});
//				req.session.oauth.access_token = oauth_access_token;
//				req.session.oauth.access_token_secret = oauth_access_token_secret;
//				console.log(results);
//				res.redirect('http://127.0.0.1:3000');
//			}
//		}
//		);
//	} else
//		next(new Error("You are not authorized to view this page."));
//});
app.get('/data/analyze/:candidate', function(req, res) {
	var stateSentiment = {};
	var response = {};
	var collection = req.params.candidate;
	var data = null;
	if(collection === 'trump') {
		data = JSON.parse(fs.readFileSync('trump.json', 'utf8'));
	} else if(collection === 'clinton') {
		data = JSON.parse(fs.readFileSync('clinton.json', 'utf8'));
	}else if(collection === 'sanders') {
		data = JSON.parse(fs.readFileSync('sanders.json', 'utf8'));
	}
	for(var j = 0; j<data.length;j++) {
		var state = data[j].tweet.state.name;
		if(state in stateSentiment) {
			stateSentiment[state].count += 1;
			stateSentiment[state].sentiment += data[j].tweet.sentiment.polarity;
		} else {
			stateSentiment[state] = {
				sentiment: data[j].tweet.sentiment.polarity,
				count: 1
			};
		}
	}
	for(var key in stateSentiment) {
		response[key] = stateSentiment[key].sentiment / stateSentiment[key].count;
	}
	res.send(JSON.stringify(response));
});

var _requestSecret;
app.get('/auth/twitter', function(req, res){
	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if (error) {
			console.log(error);
			res.send("yeah no. didn't work.")
		}
		else {
			req.session.oauth = {};
			req.session.oauth.token = oauth_token;
			console.log('oauth.token: ' + req.session.oauth.token);
			req.session.oauth.token_secret = oauth_token_secret;
			console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
			res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
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
				req.session.oauth.access_token = oauth_access_token;
				req.session.oauth.access_token_secret = oauth_access_token_secret;
				client = new Twit({
  				consumer_key: 'K88QTsj30mPqaMILCAuH7gWo9',
  				consumer_secret: 'cSzyKhn5EtsnZCi1Aut4LE7vvpJYKVTiJVRKxqDh7lukoHXQxw',
  				access_token: oauth_access_token,
  				access_token_secret: oauth_access_token_secret
                
        });
                
                res.redirect('http://127.0.0.1:3000')
		}
        });
	} else
		next(new Error("you're not supposed to be here."))
});
app.get('/authenticated', function(req, res) {
    if(req.session.oauth) {
   if(req.session.oauth.access_token && req.session.oauth.access_token_secret) {
       res.send(200);
   } else {
       res.send(401);
   }
    }
});
