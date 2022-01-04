// ---------------------- server ----------------------

// serve index.js
const http = require("http");
const httpServer = http.createServer();
httpServer.listen(8080, () => {console.log('listening on 8080')})
const websocketServer = require('websocket').server
const wsServer = new websocketServer({
    'httpServer': httpServer
})

// serve index.html
const app = require('express')();
app.listen(8081, () => {console.log('listening on 8081')})
app.get('/', (req,rsp) => rsp.sendFile(__dirname + '/index.html'))


// ---------------------- database ----------------------

const clients = {};
// clients = {
//     <clientID>: {
//         'connection': <obj>
//     },
//     <clientID>: {
//         'connection': <obj>
//     },
//     ...
// }

const games = {};
// games = {
//     gameId: {
//         cardNum: 25,
//         cards: [
//             {word: ??, color: ??, isClicked: ??},
//             {word: ??, color: ??, isClicked: ??},
//             ...
//         ],
//         clients: [
//             {clientID: ??},
//             {clientID: ??},
//             ...
//         ],
//     },
//     ...
// }

// ---------------------- handle request ----------------------

wsServer.on('request', (request) => {
    // when a user send a request to connect
    const connection = request.accept(null, request.origin);

    // configure the connection behavior
    connection.on('open', () => {console.log('opened!')})
    connection.on('close', () => {console.log('closed!')})
    connection.on('disconnect', () => {console.log('disconnected!')})
    connection.on('message', (message) => {
        const request = JSON.parse(message.utf8Data)
        console.log(request)

        // when a user send a request to create new game
        if (request.method === 'create'){
            const gameId = guid();
            games[gameId] = {
                'cardNum': 25,
                'cards': initCards(),
                'clients': []
            }
            const payload = {
                'method': 'create',
                'gameId': gameId
            }
            connection.send(JSON.stringify(payload))

            // start broadcasting
            broadcastGame();
        }

        // when a user send a request to join game
        if (request.method === 'join'){
            // update game
            const clientId = request.clientId
            const gameId = request.gameId;
            const game = games[gameId];
            game.clients.push(clientId);
            // notify join success
            const payload = {
                'method': 'join',
                'gameId': gameId
            };
            clients[clientId].connection.send(JSON.stringify(payload));
        }
        
        // when user request to click a card
        if (request.method === 'play'){
            const gameId = request.gameId;
            const cardId = request.cardId;
            games[gameId].cards[cardId].isClicked = true;
        }

        // when user request to leave game
        if (request.method === 'leave'){
            const clientId = request.clientId;
            const gameId = request.gameId;
            const index = games[gameId].clients.indexOf(clientId);
            if (index !== -1){
                games[gameId].clients.splice(index, 1)
            }

            // notify leave success
            const payload = {
                'method': 'leave',
                'status': 'success'
            };
            clients[clientId].connection.send(JSON.stringify(payload));
        }

        // when user request to close the game
        if (request.method === 'close'){
            console.log('detect client closing!')
            // delete client from game and broadcast to game clients
            const gameId = request.gameId;
            const clientId = request.clientId;
            // delete client from game if necessary
            if (gameId !== null){
                const index = games[gameId].clients.indexOf(clientId);
                if (index !== -1){
                    games[gameId].clients.splice(index, 1)
                }
            }
            // delete client connection
            delete clients[clientId];
        }
    })

    // save connection to database and notify user
    const clientId = guid();
    clients[clientId] = {
        'connection': connection
    }
    const payload = {
        'method': 'connect',
        'clientId': clientId
    }
    connection.send(JSON.stringify(payload))

})


// ---------------------- heleper functions ----------------------

function broadcastGame(){
    for (const [gameId, game] of Object.entries(games)) {
        const payload = {
            'method': 'update',
            'game': game
        }
        game.clients.forEach(c => {
            clients[c].connection.send(JSON.stringify(payload));
        })
    }

    setTimeout(broadcastGame, 1000);
}

function initCards(){
    return [
        {'word': '黄瓜', 'color': 'red', 'isClicked': false},
        {'word': '牙刷', 'color': 'blue', 'isClicked': false},
        {'word': '旗袍', 'color': 'red', 'isClicked': false},
        {'word': '小明', 'color': 'red', 'isClicked': false},
        {'word': '山楂', 'color': 'yellow', 'isClicked': false},
        {'word': '瓶', 'color': 'yellow', 'isClicked': false},
        {'word': '衣服', 'color': 'red', 'isClicked': false},
        {'word': '厨房', 'color': 'blue', 'isClicked': false},
        {'word': '北京', 'color': 'red', 'isClicked': false},
        {'word': '目录', 'color': 'blue', 'isClicked': false},
        {'word': '肥皂', 'color': 'yellow', 'isClicked': false},
        {'word': '盘子', 'color': 'yellow', 'isClicked': false},
        {'word': '橡皮泥', 'color': 'red', 'isClicked': false},
        {'word': '兔子', 'color': 'red', 'isClicked': false},
        {'word': '可乐', 'color': 'blue', 'isClicked': false},
        {'word': '蓝天', 'color': 'blue', 'isClicked': false},
        {'word': '隔壁', 'color': 'yellow', 'isClicked': false},
        {'word': '海豚', 'color': 'red', 'isClicked': false},
        {'word': '妹妹', 'color': 'blue', 'isClicked': false},
        {'word': '口腔', 'color': 'yellow', 'isClicked': false},
        {'word': '手枪', 'color': 'blue', 'isClicked': false},
        {'word': '吐鲁番', 'color': 'grey', 'isClicked': false},
        {'word': '秤', 'color': 'yellow', 'isClicked': false},
        {'word': '薯片', 'color': 'blue', 'isClicked': false},
        {'word': '仙', 'color': 'red', 'isClicked': false},
    ];
}

function S4() {return (((1+Math.random())*0x10000)|0).toString(16).substring(1);}
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();



