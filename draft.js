/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

 var express = require('express'); // Express web server framework
 var request = require('request'); // "Request" library
 var cors = require('cors');
 var neo4j = require('neo4j-driver');
 var querystring = require('querystring');
 var cookieParser = require('cookie-parser'); //more cookies?
 var fs = require('fs'); 
 var path = require('path');
 var url = require('url');
 var funcs = require('./public/js/personalgame');

 const { response } = require('express');
 
 var client_id = '8dff2688f87941fbba7b44c3ec6ce680'; // Your client id
 var client_secret = '9ba69741607c4d709bac93513ebbdd99'; // Your secret
 var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

 var driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "yonatan"));
 var session1 = driver.session();
 var session2 = driver.session();
 var personName = 'Tom Hanks';
 
 /**
  * Generates a random string containing numbers and letters
  * @param  {number} length The length of the string
  * @return {string} The generated string
  */
 
 
 var user_id;
 var popular_songs;
 var global_access_token;
 var flag = ""; /*for some reason, with out this flag which functions as a lock, the connection scrtipt happens reapetedly*/
 var access_token_global;  /*major problem with that. we cannot deal with multiple users*/
 var refresh_token_global; /*major problem with that. we cannot deal with multiple users*/
 var flag = ""; /*for some reason, without this flag which functions as a lock, the connection scrtipt happens reapetedly*/
 var participents = [];
 var games_arr = []; /*contains for each games: who answered for current round*/
 var games_num = 0;
 var generateRandomString = function(length) {
   var text = '';
   var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 
   for (var i = 0; i < length; i++) {
     text += possible.charAt(Math.floor(Math.random() * possible.length));
   }
   return text;
 };
 
 var stateKey = 'spotify_auth_state';
 
 var app = express();
 app.use('dev',function (req, res, next){});
 
 
 app.use(express.static(__dirname + '/public')) //integrate the index.html file in /public with draft.js
    .use(cors())
    .use(cookieParser());
 app.use('/boxes', express.static(__dirname + '/public/boxes.html'))
    .use(cors())
    .use(cookieParser());
  app.use('/Query', express.static(__dirname + '/public/Query.html'))
    .use(cors())
    .use(cookieParser());
  app.use('/search', express.static(__dirname + '/public/search.html'))
    .use(cors())
    .use(cookieParser());
  

    var app2 = express();
    app2.get('/', (req, res) => {
      curr_access_token = url.parse(req.url,true).query.access_token;
      curr_access_token = url.parse(req.url,true).query.refresh_token;
      
      res.redirect("/Game_page#access_token="+access_token);
    });
    const http = require('http');
    const server = http.createServer(app2);
    const { Server } = require("socket.io");
    const io = new Server(server);

    server.listen(3000, () => {
      console.log('listening on *:3000');
    });

    app2.use('/Game_page', express.static(__dirname+'/public/Game.html'))
    .use(cors())
    .use(cookieParser());

 app.get('/login', function(req, res) { //the html adresses the "/login" thingi and it goes here! cool 
 
   var state = generateRandomString(16); //what is that?
   res.cookie(stateKey, state);
 
   // your application requests authorization
   var scope = 'user-read-private user-read-email user-library-read user-read-recently-played user-read-currently-playing';
   res.redirect('https://accounts.spotify.com/authorize?' +
     querystring.stringify({
       response_type: 'code', //I think that this is the user info
       client_id: client_id,
       scope: scope,
       redirect_uri: redirect_uri,
       state: state
     }));
 }); //now we get a token?
 
 app.get('/callback', function(req, res) {
 
   // your application requests refresh and access tokens
   // after checking the state parameter
 
   var code = req.query.code || null;
   var state = req.query.state || null;
   var storedState = req.cookies ? req.cookies[stateKey] : null;
   
   if (state === null || state !== storedState) {
     res.redirect('/#' +
       querystring.stringify({
         error: 'state_mismatch'
       }));
   } else {
     res.clearCookie(stateKey);
     var authOptions = {
       url: 'https://accounts.spotify.com/api/token',
       form: {
         code: code,
         redirect_uri: redirect_uri,
         grant_type: 'authorization_code'
       },
       headers: {
         'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
       },
       json: true
     };
 
     request.post(authOptions, function(error, response, body) {
       if (!error && response.statusCode === 200) {
        
             access_token = body.access_token,
             global_access_token = body.access_token,
             refresh_token = body.refresh_token;
             access_token_global = access_token;
             refresh_token_global = refresh_token;
 
         // we can also pass the token to the browser to make requests from there
         res.redirect('/boxes#' +
           querystring.stringify({
             access_token: access_token,
             refresh_token: refresh_token
           }));
       } else {
         res.redirect('/#' +
           querystring.stringify({
             error: 'invalid_token'
           }));
       }
     });
     funcs.popular_songs().then(function(result)
     {
      popular_songs = result;
     })
   }
 });
  
app.get('/song_render',function(req,res) /*gets a random position in the recently played list of tracks, returns image url and song name*/
{
  /*should we do here callback? to deal with multiple users? or just pass in req the tokens?*/
  /*Grabios should use this function to implement the boxes in the main page*/
  var pos = req.query.pos; /*position in tracks array*/
  let curr_access_token = req.query.access_token;
  var songID =" ";
  var songname;
  var popolarity;
  var image_url;
  var options = {
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    headers: { 'Authorization': 'Bearer ' + curr_access_token },
    json: true
  };

  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {
    songID = body.items[pos].track.id;
    /*console.log(songID);*/
    songname = body.items[pos].track.name;
    popolarity = body.items[pos].track.popolarity;
    options = {
      url: 'https://api.spotify.com/v1/tracks/'+songID,
      headers: { 'Authorization': 'Bearer ' + curr_access_token },
      json: true
    };
    request.get(options, function(error, response, body) {
      console.log('https://api.spotify.com/v1/tracks/'+songID);
      image_url = body.album.images[1].url;
      res.send({image_url:image_url, songname: songname, songID: songID, popolarity: popolarity})
    });
  });

})    


app.get('/Game', (req, res) => {
    var curr_access_token = req.access_token;
    var curr_refresh_token = req.refresh_token;
    var user_id;
    var recent_tracks;

    var options = {
      url: 'https://api.spotify.com/v1/me',
      headers: { 'Authorization': 'Bearer ' + curr_access_token },
      json: true
    };

    // use the access token to access the Spotify Web API
    request.get(options, function(error, response, body) {
     user_id = body.id;
    });

    options = 
         {
          url: 'https://api.spotify.com/v1/me/player/recently-played',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
         };

    request.get(options, function(error, response, body) {
      recent_tracks = body;
    });

    io.on('connection', (socket) => {
      if(flag != socket.id)
      {
        socket.on("answered", function(data)
        {
          console.log("answering");
          games_arr[data.game_id-1].answers[data.user -1] = 1;
          /*identify who send it, change answers array and if necessary emit NextRound*/
          if(games_arr[data.game_id-1].answers[0] == 1 && games_arr[data.game_id-1].answers[1] == 1)
          {
          games_arr[data.game_id-1].answers[0] = 0;
          games_arr[data.game_id-1].answers[1] = 0;
          io.to(data.game_id).emit("NextRound");
          console.log("Thnaks God");
          }
        });
        socket.on("EndGame",function(data) /*Handle tie case*/
        {
          let game = data.game_id;
          let winner = 0;
          /*now we will abuse the games_arr*/
          games_arr[data.game_id-1].answers[data.user -1] = data.score;
          if(games_arr[data.game_id-1].answers[0] >= 1 && games_arr[data.game_id-1].answers[1] >= 1)
          {
            winner = 0;
            if(games_arr[data.game_id-1].answers[0]  > games_arr[data.game_id-1].answers[1] )
            {
              winner = 1;
            }
            if(games_arr[data.game_id-1].answers[0]  < games_arr[data.game_id-1].answers[1] )
            {
              winner = 2;
            }
            io.to(data.game_id).emit("Exit", {user_1_score: games_arr[data.game_id-1].answers[0] , user_2_score: games_arr[data.game_id-1].answers[1], winner:winner});
          }
        })
        flag = socket.id;
        // console.log(socket.id);
        // if(recent_tracks != undefined)
        // {console.log(recent_tracks.items[0].track.name);}
        // console.log("Connected");
        participents.push({user_id: user_id});
        // console.log(participents.length);
        console.log(socket.id);
        console.log("Connected");
        participents.push({user_id: user_id, recent_tracks: recent_tracks});
        console.log(participents.length);
        if(participents.length == 1)
        {io.emit('IdentifyUser',1); /*need to emit to specific room?*/
        games_num += 1;
        games_arr.push({game_id: games_num, answers: [0,0]});}
        socket.join(games_num);
        /*console.log("Connected");*/
        /*console.log(participents[0].recent_tracks.items[1]);*/
        /*console.log(participents[0].recent_tracks.items[2].track.name);*/
        if(participents.length >= 2)
        {
          io.to(games_num).emit('IdentifyUser',2); /*second user will go here, first user will stay with id =1?*/
          console.log("Here");
          console.log(socket.id);
          user_1 = participents.pop();
          user_2 = participents.pop();
          console.log(participents.length);
          io.to(games_num).emit('InitGame', {user_1:user_1.recent_tracks, user_2: user_2.recent_tracks, game_id: games_num});
          /*FIX! NEED TO FLUSH AGAIN AND AGIN TILL THERE IS 0/1 PARTICIPENTS IN THE ARRAY!!!!!!!!*/
        }
      }
      });
    // io.on('answered',(socket) =>
    // {
    //   console.log("Answered");
    //   var cell =  games_arr[data.game_id];
    //   cell.answers[data.user-1] += 1; /*user with that user id answered*/
    //   if(cell.answers[0] > 0 && cell.answers[1] > 0)
    //   {
    //     cell.answers[0] = 0;
    //     cell.answers[1] = 0;
    //     io.to(game_id).emit("NextRound");
    //   }
    // })
  res.redirect("http://localhost:3000?access_token="+curr_access_token+"&refresh_token="+curr_refresh_token);
});

// function getHashParams() {
//   var hashParams = {};
//   var e, r = /([^&;=]+)=?([^&;]*)/g,
//       q = window.location.hash.substring(1);
//   while ( e = r.exec(q)) {
//      hashParams[e[1]] = decodeURIComponent(e[2]);
//   }
//   return hashParams;
// }

// app.get('/queryjs', function(req,res)
// {
//   // var params = getHashParams();
//   // let curr_access_token = params.access_token;
//   // let curr_refresh_token = params.access_token;

//   res.redirect('/Query#' +
//            querystring.stringify({
//              access_token: access_token_global, /*problem!*/
//              refresh_token: refresh_token_global
//            }));
//   console.log("HI from Query!");
// })
 
 app.get('/refresh_token', function(req, res) {
 
   // requesting access token from refresh token
   var refresh_token = req.query.refresh_token;
   var authOptions = {
     url: 'https://accounts.spotify.com/api/token',
     headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
     form: {
       grant_type: 'refresh_token',
       refresh_token: refresh_token
     },
     json: true
   };

   request.post(authOptions, function(error, response, body) {
     if (!error && response.statusCode === 200) {
       var access_token = body.access_token;
       res.send({
         'access_token': access_token
       });
     }
   });
 });

 app.get("/get/offers", function(req,res)
 {
   let songID = req.query.songID;
   let name = req.query.name;
   let views = req.query.views;
   funcs.get_offers(songID,name,views).then(function(result)
   {
     res.send(
       {
         words: result
       }
     )
   })
 })

 app.get("/search", function(req,res)
 {
   let string = req.query.string;
   funcs.search(string).then(function(result)
   {
     res.send(
       {
         songs: result
       }
     )
   })
 });

 app.get("/get_track_name",function(req,res)
 {
  var songID = req.query.songID;
  var songname;
  var popularity;
  var image_url;
  var artist;
  var song_url;
  var options = {
    url: 'https://api.spotify.com/v1/tracks/'+songID,
    headers: { 'Authorization': 'Bearer ' + global_access_token },
    json: true
  };
  request.get(options, function(error, response, body) {
    // console.log('https://api.spotify.com/v1/tracks/'+songID);
    image_url = body.album.images[1].url;
    songname = body.name; 
    popularity = body.popularity; 
    artist = body.album.artists[0].name;
    song_url = body.uri;
    res.send({image_url:image_url, songname: songname, popularity: popularity, artist: artist, song_url: song_url})
  });
 })

 app.get("/get/superusers", function(req,res)
 {
   funcs.get_super_users().then(function(result)
   {
     res.send(
       {
         super_users: result
       }
     )
   })
 })

 app.get("/add/word",function(req,res)
 {
   let userID = req.query.userID;
   let songID = req.query.songID;
   let username = req.query.username;
   let name = req.query.name;
   let views = req.query.views;
   let word = req.query.word;
   funcs.add_word(userID, username, songID, name, views, word);
 })

 app.get("/choose/word",function(req,res)
 {
   let userID = req.query.userID;
   let songID = req.query.songID;
   let word = req.query.word;
   funcs.add_word(userID,songID,word);
 })

 app.get("/get_weight", function(req,res)
{
  let weight;
  let word = req.query.word;
  let songID = req.query.songID;
  funcs.get_weight(songID,word).then(function(result)
   {
     res.send(
       {
         weight: result
       }
     )
   })
});

 exports.ret_io = function (){return io};
 console.log('Listening on 8888');
 app.listen(8888);
