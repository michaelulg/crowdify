<!DOCTYPE html>
<html>
  <head>
    <title>Socket.IO chat</title>
    <style>
      body { margin: 0; padding-bottom: 3rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

      #form { background: rgba(0, 0, 0, 0.15); padding: 0.25rem; position: fixed; bottom: 0; left: 0; right: 0; display: flex; height: 3rem; box-sizing: border-box; backdrop-filter: blur(10px); }
      #input { border: none; padding: 0 1rem; flex-grow: 1; border-radius: 2rem; margin: 0.25rem; }
      #input:focus { outline: none; }
      #form > button { background: #333; border: none; padding: 0 1rem; margin: 0.25rem; border-radius: 3px; outline: none; color: #fff; }

      #messages { list-style-type: none; margin: 0; padding: 0; }
      #messages > li { padding: 0.5rem 1rem; }
      #messages > li:nth-child(odd) { background: #efefef; }
    </style>
  </head>
  <body>
    <div id = "WaitingRoom">
      Hello! Welcome...
    </div>
    <div id = "GameScreen">
      <div id = "User" value = 1>
        <button class="btn btn-default" id="userid" value = 1>{userid}</button>
      </div>
      <div id = "song">
          <dt>Song: </dt><dd class="text-overflow" id = "name">{{name}}</dd>
      </div>
      <button class="btn btn-default" id="option1" value = 1>{option1}</button>
      <br>
      <button class="btn btn-default" id = "option2" value = 1>{option2}</button>
    </div>
    <div id = "End">
      Oh No! This is the end of the game. everything good comes to an end...
      <dt>You: </dt><dd class="text-overflow" id = "state">{{state}}</dd>
    </div>
    <script>
    document.getElementById("WaitingRoom").style.display = "block";
    document.getElementById("GameScreen").style.display = "none";
    document.getElementById("End").style.display = "none";
    </script>
    <script type = "text/javascript" src = "js/game_manager.js"></script>  
    <script  type="text/javascript" src="/socket.io/socket.io.js"></script>
    <script> 
    var lock_user_id = 0; /*user id has been set- to protect from other player arriving and spiling it*/
    var user_1_score = 0;
    var user_2_score = 0;
    var user_1_tracks;
    var user_2_tracks;
    answers = [0,0]; /*who answered? two flags*/
    var option1 =  document.getElementById("option1");
    var option2 =  document.getElementById("option2");
    var player =  document.getElementById("name");
    let i = 0;
    let flag;
    let game_id = 0;
    const socket = io(window.location.origin, {transports: ['websocket']});
    
    socket.on('IdentifyUser', function(data)
    {
      if(lock_user_id == 0){
        document.getElementById("userid").innerHTML = socket.id;
        document.getElementById("User").value = data;
        
        lock_user_id = 1;
      }
    })
    socket.on('InitGame', function(data)
    {
      document.getElementById("WaitingRoom").style.display = "none";
      document.getElementById("GameScreen").style.display = "block";
      document.getElementById("End").style.display = "none";
      /*replace room-screen with game screen*/
        flag = 0; /*we dont allow more than one click*/
        user_1_tracks = data.user_1;
        user_2_tracks = data.user_2;
        game_id = data.game_id;
        document.getElementById("userid").innerHTML = data.game_id;
        player.innerHTML = data.user_1.items[i].track.name;
        option1.innerHTML = "data.user_1"; /*should be word from the data base*/
        option2.innerHTML = "data.user_2"; /*should be word from the data base*/
        option1.value = 1; /*should be rank of the word from DB*/
        option2.value = 1; /*should be rank of the word from DB*/
        
        option2.addEventListener('click', function()
        {
         
          if(flag == 0)
          {
          
          if(document.getElementById("User").value == 1)
          {
            /*manager of the game*/
            user_1_score += option2.value;
            flag = 1;
            socket.emit("answered", {user: document.getElementById("User").value, game_id: game_id});
          }
          else
          {
            user_2_score += option2.value;
            flag = 1;
            socket.emit("answered", {user: document.getElementById("User").value, game_id: game_id});
          }
          }
        })

        option1.addEventListener('click', function()
        {
          
          if(flag == 0)
          {
          
          if(document.getElementById("User").value == 1)
          {
            /*manager of the game*/
            user_1_score += option1.value;
            flag = 1;
            socket.emit("answered", {user: document.getElementById("User").value, game_id: game_id});
          }
          else
          {
            user_2_score += option1.value;
            flag = 1;
            socket.emit("answered", {user: document.getElementById("User").value, game_id: game_id});
          }
          }
        })
    })
    socket.on("NextRound",function()
    {
      i += 1;
      flag = 0;
      if(i % 2 == 0)
      {
        document.getElementById("name").innerHTML = user_1_tracks.items[i].track.name;
        option1.innerHTML = "data.user_1"; /*should be word from the data base*/
        option2.innerHTML = "data.user_2"; /*should be word from the data base*/
      }
      if(i % 2 == 1)
      {
        document.getElementById("name").innerHTML = user_2_tracks.items[i].track.name;
        option1.innerHTML = "data.user_3"; /*should be word from the data base*/
        option2.innerHTML = "data.user_4"; /*should be word from the data base*/
      }
      if(i == 2)
      {
        if(document.getElementById("User").value == 1)
        {
        socket.emit("EndGame", {user: 1 , score: user_1_score, game_id:game_id});
        }
        if(document.getElementById("User").value == 2)
        {
        socket.emit("EndGame", {user: 2 , score: user_2_score, game_id:game_id});
        } 
        
      }
    })
    socket.on("Exit", function(data)
    {
      /*render final screen*/
      user_1_score = data.user_1_score;
      user_2_score = data.user_2_score;
      var winner = data.winner;
      if(winner == document.getElementById("User").value)
      {
        document.getElementById("WaitingRoom").style.display = "none";
        document.getElementById("GameScreen").style.display = "none";
        document.getElementById("End").style.display = "block";
        document.getElementById("state").innerHTML = "Winner";
        /*render win*/
      }
      else if(winner == 0)
      {
        document.getElementById("WaitingRoom").style.display = "none";
        document.getElementById("GameScreen").style.display = "none";
        document.getElementById("End").style.display = "block";
        document.getElementById("state").innerHTML = "Tied";
        /*render tie*/
      }
      else
      {
        document.getElementById("WaitingRoom").style.display = "none";
        document.getElementById("GameScreen").style.display = "none";
        document.getElementById("End").style.display = "block";
        document.getElementById("state").innerHTML = "Loose (But we still love you)";
        /*render lose*/
      }
    })
    
    </script>
  </body>
</html>
