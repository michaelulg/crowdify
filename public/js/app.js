
//Sets important constants and variables
let rows = document.getElementsByClassName("gridRow");
let cells = document.getElementsByClassName("cell");

//Creates a default grid sized 16x16 
function defaultGrid() {
    const container = document.getElementById("container");
    makeRows(10);
    makeColumns(10);
    container.addEventListener("mouseover", function( event ) {
        // highlight the mouseover target
        event.target.style.backgroundColor = "black";
        let square1 = document.createElement("a");
        square1.innerHTML += "Game"
        event.target.appendChild(square1).className = "square";
        
        let square2 = document.createElement("a");
        square2.innerHTML += "Query"
        event.target.appendChild(square2).className = "square";
      
        // reset the color after a short delay
        //setTimeout(function() {
        //  event.target.style.backgroundColor = "#" + Math.floor(Math.random()*16777215).toString(16);;
        //}, 500);
      }, false);
    container.addEventListener("mouseout", function( event ) {
        event.target.style.backgroundColor = "#" + Math.floor(Math.random()*16777215).toString(16);
        event.target.textContent = '';
    }, false);
}

//Takes (rows, columns) input and makes a grid
function makeRows(rowNum) {
    //Creates rows
    for (r = 0; r < rowNum; r++) {
        row = document.createElement("div");
        gRow = container.appendChild(row);
        gRow.className = "gridRow";
    };
};
function getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
}

//Creates columns
function makeColumns(cellNum) {
    for (i = 0; i < rows.length; i++) {
        for (j = 0; j < cellNum; j++) {
            var params = getHashParams();
            var access_token = params.access_token;
            var refresh_token = params.refresh_token;
            let newCell = document.createElement("a");
            newCell.setAttribute("href", "/Query#access_token="+access_token+ "&refresh_token="+refresh_token);
            
            /*pos = Math.floor((Math.random()*20 + 1));
            var params = getHashParams();
            var access_token = params.access_token;
            $.ajax({
                url: '\song_render',
                data: {
                    access_token : access_token,
                    pos: pos
                }, 
                async : false,
                success: function(response) {
                    songname = response.songname;
                    image_url = response.image_url;

                }
            });*/


            // newCell.setAttribute("href","/Game?access_token="+access_token+"&refresh_token="+refresh_token);
            // newCell.style.cursor = "default";
            const randomColor = Math.floor(Math.random()*16777215).toString(16);
            while (randomColor == 000000) {
                const randomColor = Math.floor(Math.random()*16777215).toString(16);
            };
            newCell.style.backgroundColor = "#" + randomColor;
            newCell.setAttribute("style", 
            "background-image: url(https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Hotdog_-_Evan_Swigart.jpg/1280px-Hotdog_-_Evan_Swigart.jpg);background-size: 145px; width: 145px; height: 145px;");
            rows[j].appendChild(newCell).className = "cell";
        };
    };
};

function mouseOver() {
    document.getElementById("container").style.backgroundColor = "black";
}
  
function mouseOut() {
    document.getElementById("container").style.backgroundColor = "red";
}

function getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
}
function showsearch() {
    var search = document.getElementById("search_term").value;
    var params = getHashParams();
    access_token = params.access_token;
    window.location.href = "search?" + search + "#access_token="+access_token;
}

function getSearchTerm() {
    var elem = document.getElementById("search-head");

    elem.insertAdjacentHTML('beforeend', '<h7>'+decodeURI(location.search.substring(1)).split('&')[0]+'</h7><br>')
    //alert(decodeURI(location.search.substring(1)).split('#')[0]);

}

async function generateSongList() {
    var elem = document.getElementById("search-head");

    let song_ids = ["7mEDVrAHDnQJStDo8jKJJm", "7mEDVrAHDnQJStDo8jKJJm", "1ISMa0THMDKFBq2UMfm02e", "63Wv3KNxCfnuUIW988TyIl", "2iRniYXjMHKmwXqA2jYXP7", "2iRniYXjMHKmwXqA2jYXP7"];
    let string = decodeURI(location.search.substring(1)).split('&')[0];
    /*$.ajax({
        url: '\search',
        data: {
            string : string
        },
        success: function(response) {
            song_ids = response.songs;
        }
    })

    let songs = song_ids; */
    let songs = song_ids;

    let songname;
    let image_url;
    let artist;
    let song_url;
    

    for (let i = 0; i < songs.length; i++) {
        let songID = song_ids[i];
        var params = getHashParams();
        var access_token = params.access_token;

        $.ajax({
            url: '\get_track_name',
            data: {
                songID : songID,
                access_token : access_token
            }, 

            async: false,
            success: function(response) {
                songname = response.songname;
                image_url = response.image_url;
                artist = response.artist;
                song_url = response.song_url;
            }
        });
        songs[i] = {songname : songname, artist : artist, image_url : image_url, song_url : song_url};
        var elem = document.getElementById("search-results");
        elem.insertAdjacentHTML('afterbegin', '<li class="media"> <div id="search-img' + i + '" class="col-lg-14"> </div> <div class="media-body"> <h3 class="list-item-title">' + songname + '</h3> <p class="list-item-text"> By ' + artist + '</p> </div> <a class="btn-solid-reg page-scroll" href=' + song_url + '>Play song</button> </li>'); 
        let img = document.getElementById("search-img" + i);
        img.setAttribute("style", 
            "background-image: url("+image_url+");background-size: 76.4px; width: 76.4px; height: 76.4px;");
        img.setAttribute("href", song_url);
    }
}

function gedData(songID, access_token) {
    return $.ajax({
        url: '\get_track_name',
        data: {
            songID : songID,
            access_token : access_token
        }, 
        async: false,
        success: function(response) {
            songname = response.songname;
            image_url = response.image_url;
            artist = response.artist;
            song_url = response.song_url;
        }
    });
};
// defaultGrid();