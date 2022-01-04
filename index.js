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

            if (Object.hasOwn(games, gameId)){
                const game = games[gameId];
                
                console.log("---")
                console.log(game)
                game.clients.push(clientId);
                // notify join success
                const payload = {
                    'method': 'join',
                    'gameId': gameId
                };
                clients[clientId].connection.send(JSON.stringify(payload));
            }
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

        // when user request to restart game
        if (request.method === 'restart'){
            const gameId = request.gameId;
            games[gameId].cards = initCards();
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

    setTimeout(broadcastGame, 500);
}

function initCards(){
    const numCards = 25;
    let words = ["黄瓜", "牙刷", "旗袍", "小明", "山楂", "瓶", "衣服", "厨房", "北京", "目录", "肥皂", "盘子", "橡皮泥", "兔子", "可乐", "蓝天", "隔壁", "海豚", "妹妹", "口腔", "手枪", "吐鲁番", "秤", "薯片", "仙", "天空", "泳池", "项链", "舟", "冬青", "孔雀", "礼品", "西藏", "地狱", "缝纫机", "诅咒", "菩提", "白骨精", "蚊子", "美白", "醉", "葫芦娃", "开心果", "呼噜", "火箭", "钾", "飞", "科学家", "壁咚", "实验", "把手", "馅饼", "甲壳虫", "脸", "杀马特", "黄金", "龙", "雷", "炸鸡", "帕金森", "水", "马桶", "黑夜", "香蕉", "拉斯维加斯", "奥特曼", "小怪兽", "动画片", "痤疮", "糖", "发电机", "版权", "三文鱼", "对号", "南美", "卧室", "吸尘器", "鸭子", "花生", "垃圾", "瑜伽", "情人节", "快递", "书包", "恐龙", "喇叭", "黑板", "暖壶", "灵魂", "扭曲", "冬瓜", "油条", "数字", "白色", "球", "蜂蜜", "蕾丝", "鼠标", "传单", "整容", "速度", "脚趾"];
    let colors = [
        "red", "red", "red", "red", "red", "red", "red", "red", "red",
        "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue",
        "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow",
        "grey"
    ]
    shuffle(words);
    shuffle(colors);

    cards = [];
    for (let i = 0; i<numCards; i++){
        cards.push({
            'word': words[i],
            'color': colors[i],
            'isClicked': false
        })
    }

    return cards;
}

function S4() {return (((1+Math.random())*0x10000)|0).toString(16).substring(1);}
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();

// ref: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

