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
 
 var access_token_global;  /*major problem with that. we cannot deal with multiple users*/
 var refresh_token_global; /*major problem with that. we cannot deal with multiple users*/
 var flag = ""; /*for some reason, without this flag which functions as a lock, the connection scrtipt happens reapetedly*/
 var participents = [];
 var games_arr = []; /*contains for each games: who answered for current round*/
 var games_num = 0;
 var user_id; /*major problem with that. we cannot deal with multiple users*/
 var recent_tracks; /*major problem with that. we cannot deal with multiple users*/
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
  

    var app2 = express();
    app2.get('/', (req, res) => {
      res.sendFile(__dirname + '/public/Game.html');
    });
    const http = require('http');
    const server = http.createServer(app2);
    const { Server } = require("socket.io");
    const io = new Server(server);

    server.listen(3000, () => {
      console.log('listening on *:3000');
    });
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
             refresh_token = body.refresh_token;
             access_token_global = access_token;
             refresh_token_global = refresh_token;
 
         var options = {
           url: 'https://api.spotify.com/v1/me',
           headers: { 'Authorization': 'Bearer ' + access_token },
           json: true
         };
 
         // use the access token to access the Spotify Web API
         request.get(options, function(error, response, body) {
          user_id = body.id;
          /*console.log(body);*/
         });

         options = 
         {
          url: 'https://api.spotify.com/v1/me/player/recently-played',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
         };

         request.get(options, function(error, response, body) {
          recent_tracks = body;
          /*console.log(body);*/
         });
 
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
    options = {
      url: 'https://api.spotify.com/v1/tracks/'+songID,
      headers: { 'Authorization': 'Bearer ' + access_token_global },
      json: true
    };
    request.get(options, function(error, response, body) {
      console.log('https://api.spotify.com/v1/tracks/'+songID);
      image_url = body.album.images[1].url;
      res.send({image_url:image_url, songname: songname, songID: songID})
    });
  });

})    

app.get('/Game', (req, res) => {
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
  res.redirect("http://localhost:3000");
});


app.get('/queryjs', function(req,res)
{
  res.redirect('/Query#' +
           querystring.stringify({
             access_token: access_token_global,
             refresh_token: refresh_token_global
           }));
  console.log("HI from Query!");
})
 
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
 exports.ret_io = function (){return io};
 console.log('Listening on 8888');
 app.listen(8888);