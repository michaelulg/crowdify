
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
            newCell.setAttribute("href", "/Query#access_token="+access_token+"&refresh_token="+refresh_token);

            //newCell.setAttribute("href","/Game?access_token="+access_token+"&refresh_token="+refresh_token);
            newCell.style.cursor = "default";
            const randomColor = Math.floor(Math.random()*16777215).toString(16);
            while (randomColor == 000000) {
                const randomColor = Math.floor(Math.random()*16777215).toString(16);
            };
            newCell.style.backgroundColor = "#" + randomColor;
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

  

// defaultGrid();