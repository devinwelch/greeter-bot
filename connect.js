//Red   - 🔴
//White - ⚪
//Blue  - 🔵

class ConnectFour {
    constructor() {
        for (i = 0; i < 6; i++) {
            for (j = 0; j < 7; j++) {
                this.board[i][j] = "⚪";
            }
        }
        this.isRedTurn = true;
    }

    constructor(board) {
        this.board = board;
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

    getCell(x, y) {
        return this.board[x][y];
    }

    setCell(x, y, cell) {
        this.board[x][y] = this.isRedTurn ? "🔴" : "🔵";
    }

    getBoard() {
        boardString = "";
        for (i = 0; i < 6; i++) {
            for (j = 0; j < 7; j++) {
                boardString += this.getCell(i, j);
            }
            boardString += "\n";
        }

        return boardString;
    }

    placePiece(column) {
        for (row = 5; row >= 0; row--) {
            if (getCell(row, column) === "⚪") {
                this.setCell(row, column, this.isRedTurn);
            }
        }
    }
}