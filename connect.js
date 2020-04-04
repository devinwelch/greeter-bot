//Red   - 🔴
//White - ⚪
//Blue  - 🔵

//sets the board string as empty or recreates board if given parameter
function ConnectFour(board) {
    if (board !== undefined) { 
        board.toBoard();
        redCount = 0;
        blueCount = 0;
        for (i = 0; i < 6; i++) {
            for (j = 0; j < 7; j++) {
                if(this.getCell(i, j) === "🔴") redCount++;
                else if(this.getCell(i, j) === "🔵") blueCount++;
            }
        }
        this.isRedTurn = redCount === blueCount;
    }
    else {
        for (i = 0; i < 6; i++) {
            for (j = 0; j < 7; j++) {
                this.board[i][j] = "⚪";
            }
        }
        this.isRedTurn = true;
    }
}

//transform string into board
function toBoard(boardString) {
    boardString.replace("Connect 4!\n", "");
    boardArray = boardString.split(/(:white_circle:|:red_circle:|:large_blue_circle:)/);
    boardIndex = 0;

    for (i = 0; i < 6; i++) {
        for (j = 0; j < 7; j++) {
            this.setCell(i, j, boardArray[boardIndex]);
            boardIndex++;
        }
    }
}

//return the emoji in the selected cell
function getCell(x, y) {
    return this.board[x][y];
}

//sets the cell to the selected emoji
function setCell(x, y, cell) {
    this.board[x][y] = cell || this.isRedTurn ? "🔴" : "🔵";
}

//gets the board string
function getBoard() {
    boardString = "Connect 4!\n";
    for (i = 0; i < 6; i++) {
        for (j = 0; j < 7; j++) {
            boardString += this.getCell(i, j);
        }
        boardString += "\n";
    }

    return boardString;
}

//places the piece in the selected column
//returns true if piece is placed, false if column is full
function placePiece(column) {
    for (row = 5; row >= 0; row--) {
        if (getCell(row, column) === "⚪") {
            this.setCell(row, column);
            return true;
        }
    }

    return false;
}

module.exports = ConnectFour;




        //connect four
        /*if (reaction.message.content.startsWith("Connect 4!")) {
            let board = new connectFour.ConnectFour(reaction.message.content)
            switch(reaction.emoji.name) {
                case "one":
                    board.placePiece(0)
                    break
                case "two":
                    board.placePiece(1)
                    break
                case "three":
                    board.placePiece(2)
                    break
                case "four":
                    board.placePiece(3)
                    break
                case "five":
                    board.placePiece(4)
                    break
                case "six":
                    board.placePiece(5)
                    break
                case "seven":
                    board.placePiece(6)
                    break
                default:
                    break
            }
            reaction.messsage.edit(board.getBoard())
        }*/