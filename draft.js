/**
 * This is the node js server
 * This is the primal part of the project
 * Here we define 2 apps, one for the game (on port 3000) and the other for the rest of the website (port 8888)
 */

var express = require('express'); 
var request = require('request'); 
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser'); 
require('fs'); 
require('path');
var url = require('url');
var neo4j = require('neo4j-driver');
var funcs = require('./public/js/personalgame');
 
var client_id = '8dff2688f87941fbba7b44c3ec6ce680'; // client id, allocated for our registered project in spotify
var client_secret = '9ba69741607c4d709bac93513ebbdd99'; // secret id
var redirect_uri = 'http://localhost:8888/callback'; //redirect uri, The uri that login re-directs to

var driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "yonatan"));
var session1 = driver.session();
var session2 = driver.session();
 
/**
* Generates a random string containing numbers and letters
* @param  {number} length The length of the string
* @return {string} The generated string
*/
 
var popular_songs; /*used for the game*/
var flag = ""; /*without this flag, which functions as a lock, the connection scrtipt happens reapetedly*/
var participents = []; /*information about participents that wish to play the game*/
var games_arr = []; /*information about all games currently taking place*/
var games_num = 0; /*total number of games*/

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
 
var stateKey = 'spotify_auth_state';
 
var app1 = express();
var app2 = express();
/* ********************************** login page, home page, Query and search ********************************* */
app1.use('dev',function (req, res, next){});
app1.use(express.static(__dirname + '/public')) 
  .use(cors())
  .use(cookieParser());
app1.use('/boxes', express.static(__dirname + '/public/boxes.html')) 
  .use(cors())
  .use(cookieParser());
app1.use('/Query', express.static(__dirname + '/public/Query.html'))
  .use(cors())
  .use(cookieParser());
app1.use('/search', express.static(__dirname + '/public/search.html'))
  .use(cors())
  .use(cookieParser());

/* ********************************** Game Page ********************************* */
app2.use('/Game_page', express.static(__dirname+'/public/Game.html'))
  .use(cors())
  .use(cookieParser());
  
const http = require('http');
const server = http.createServer(app2);
const { Server } = require("socket.io");
const io = new Server(server);

/* ****************************************************************************** */  

app2.get('/', (req, res) => {
  curr_access_token = url.parse(req.url,true).query.access_token;
  curr_access_token = url.parse(req.url,true).query.refresh_token;  
  res.redirect("/Game_page#access_token="+access_token);
});
    
/**
* This is the code for the login 
* The login bottun from the index page redirects here, where the authorization taked place
*/ 
app1.get('/login', function(req, res) { 
 
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
 
  // application requests authorization, with scope as permissions
  var scope = 'user-read-private user-read-email user-library-read user-read-recently-played user-read-currently-playing';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code', 
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
}); 

app1.get('/callback', function(req, res) {
 
  // application requests refresh and access tokens
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
        
        var access_token = body.access_token,
        refresh_token = body.refresh_token;

        // passing the tokens to browser
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

    funcs.popular_songs().then(function(result) /*initiate popular songs*/
    {
    popular_songs = result;
    })
  }
});

/** 
* @param curr_access_token The access token
* @return a list of the images url
* from the recently played tracks list
*/
app1.get('/get_images_list',function(req,res){
  var curr_access_token = req.query.access_token;
  var options = {
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    headers: { 'Authorization': 'Bearer ' + curr_access_token },
    json: true
  };
  request.get(options,function(error,response,body){
    var songs = body.items;
    var urls = [];
    for(i = 0 ; i < songs.length ; i++)
    {
      urls.push(songs[i].track.album.images[0].url)
    }
    res.send({urls: urls});
  })
})

/** 
* @param curr_access_token The access token
* @param pos position in the user recently played tack list
* @return data about a certain song: image url, name, 
* id in the spotify database, popoularity (from spotify databases)
*/
app1.get('/song_render',function(req,res) /*gets a random position in the recently played list of tracks, returns image url and song name*/
{
  
  var pos = req.query.pos; /*position in the tracks array*/
  let curr_access_token = req.query.access_token;
  var songID =" ";
  var songname;
  var popularity;
  var image_url;
  var options = {
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    headers: { 'Authorization': 'Bearer ' + curr_access_token },
    json: true
  };

  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {
    console.log("body:")
    console.log(body.items[0]);
    songID = body.items[pos].track.id;
    /*console.log(songID);*/
    songname = body.items[pos].track.name;
    popularity = body.items[pos].track.popularity;
    options = {
      url: 'https://api.spotify.com/v1/tracks/'+songID,
      headers: { 'Authorization': 'Bearer ' + curr_access_token },
      json: true
    };
    request.get(options, function(error, response, body) {
      console.log('https://api.spotify.com/v1/tracks/'+songID);
      image_url = body.album.images[1].url;
      res.send({image_url:image_url, songname: songname, songID: songID, popularity: popularity})
    });
  });

})    

/** 
* The main code for the game, defining the socket server for it and socket-clients properties
* @param curr_access_token The access token
* @param curr_refresh_token The refresh token
* @redirects to port 3000, the port for the game
*/
app1.get('/Game', (req, res) => {
  var curr_access_token = req.access_token;
  var curr_refresh_token = req.refresh_token;

  if(access_token == undefined)
  {
    res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
  }

  var user_id;
  var username;
  var recent_tracks;

  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + curr_access_token },
    json: true
  };

  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {
    user_id = body.id;
    username = body.display_name;
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
      socket.on("EndGame",function(data) 
      {
        let game = data.game_id;
        let winner = 0;
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
      participents.push({'user_id': user_id, 'username': username});
      if(participents.length == 1)
      {
        io.emit('IdentifyUser',1); /*need to emit to specific room?*/
        games_num += 1;
        games_arr.push({game_id: games_num, answers: [0,0]});
      }
      socket.join(games_num);
      if(participents.length >= 2)
      {
        io.to(games_num).emit('IdentifyUser',2); 
        user_2 = participents.pop();
        user_1 = participents.pop();
        io.to(games_num).emit('InitGame', {user_1_id: user_1['user_id'], user_2_id: user_2['user_id'],
        user_1_name: user_1['username'], user_2_name: user_2['username'],
        tracks: popular_songs, game_id: games_num});  
      }
    }
  });
  res.redirect("http://localhost:3000?access_token="+curr_access_token+"&refresh_token="+curr_refresh_token);
});

/**
* @param refresh_token the refresh token
* @return the new access token 
*/
app1.get('/refresh_token', function(req, res) {
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

app2.get("/get_tack_name",function(req,res)
{

  var curr_access_token = req.query.access_token;
  console.log(curr_access_token);
  var songID = req.query.songID;
  var songname;
  var popularity;
  var image_url;
  var artist;
  var song_url;
  var options = {
    url: 'https://api.spotify.com/v1/tracks/'+songID,
    headers: { 'Authorization': 'Bearer ' + curr_access_token },
    json: true
  };
  request.get(options, function(error, response, body) {
    // console.log('https://api.spotify.com/v1/tracks/'+songID);
    image_url = body.album.images[1].url;
    songname = body.name; 
    popularity = body.popularity; 
    artist = body.album.artists[0].name;
    song_url = body.uri;
    res.send({"image_url":image_url, "songname": songname, "popularity": popularity, "artist": artist, "song_url": song_url})
  });
});

app1.get("/get_track_name",function(req,res)
{
  var curr_access_token = req.query.access_token;
  console.log(curr_access_token);
  var songID = req.query.songID;
  var songname;
  var popularity;
  var image_url;
  var artist;
  var song_url;
  var options = {
    url: 'https://api.spotify.com/v1/tracks/'+songID,
    headers: { 'Authorization': 'Bearer ' + curr_access_token },
    json: true
  };
  request.get(options, function(error, response, body) {
    // console.log('https://api.spotify.com/v1/tracks/'+songID);
    console.log(body);
    image_url = body.album.images[1].url;
    songname = body.name; 
    popularity = body.popularity; 
    artist = body.album.artists[0].name;
    song_url = body.uri;
    res.send({"image_url":image_url, "songname": songname, "popularity": popularity, "artist": artist, "song_url": song_url})
  });
});

/************************************ call function of the neo4j database ************************************** */
app1.get("/get_offers", function(req,res)
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
});

app2.get("/get_offers", function(req,res)
{
  console.log('inside get_offers');
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
});


app1.get("/search", function(req,res)
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


app1.get("/get_superusers", function(req,res)
{
console.log('inside get_superusers in app2');
  funcs.get_superusers().then(function(result)
  {
    res.send(
      {
        super_users: result
      }
    )
  })
})

app2.get("/get_superusers", function(req,res)
{
  console.log('inside get_superusers in app');
  funcs.get_superusers().then(function(result)
  {
    res.send(
      {
        super_users: result
      }
    )
  })
})


app1.get("/word",function(req,res)
{
  let userID = req.query.userID;
  let songID = req.query.songID;
  let username = req.query.username;
  let name = req.query.name;
  let views = req.query.views;
  let word = req.query.word;
  funcs.add_word(userID, username, songID, name, views, word);
})

app2.get("/word",function(req,res)
{
  let userID = req.query.userID;
  let songID = req.query.songID;
  let username = req.query.username;
  let name = req.query.name;
  let views = req.query.views;
  let word = req.query.word;
  funcs.add_word(userID, username, songID, name, views, word);
})


app1.get("/choose/word",function(req,res)
{
  let userID = req.query.userID;
  let songID = req.query.songID;
  let word = req.query.word;
  funcs.add_word(userID,songID,word);
})

app2.get("/choose/word",function(req,res)
{
  let userID = req.query.userID;
  let songID = req.query.songID;
  let word = req.query.word;
  funcs.add_word(userID,songID,word);
})


app1.get("/get_weight", function(req,res)
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

app2.get("/get_weight", function(req,res)
{
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
/*************************************************************************************************************** */

console.log('Listening on 8888');
app1.listen(8888);

server.listen(3000, () => {
console.log('listening on *:3000');
});
