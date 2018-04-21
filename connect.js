//Red   - 🔴
//White - ⚪
//Blue  - 🔵

class ConnectFour {
    //sets the board string as empty or recreates board if given parameter
    constructor(board) {
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
    toBoard(boardString) {
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
    getCell(x, y) {
        return this.board[x][y];
    }

    //sets the cell to the selected emoji
    setCell(x, y, cell) {
        this.board[x][y] = cell || this.isRedTurn ? "🔴" : "🔵";
    }

    //gets the board string
    getBoard() {
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
    placePiece(column) {
        for (row = 5; row >= 0; row--) {
            if (getCell(row, column) === "⚪") {
                this.setCell(row, column);
                return true;
            }
        }

        return false;
    }
}