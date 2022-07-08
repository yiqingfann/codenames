// ---------------------- server ----------------------

// serve index.js
const http = require("http");
const httpServer = http.createServer();
httpServer.listen(8080, () => { console.log('listening on 8080') })
const websocketServer = require('websocket').server
const wsServer = new websocketServer({
    'httpServer': httpServer
})

// // serve index.html
// const app = require('express')();
// app.listen(8081, () => {console.log('listening on 8081')})
// app.get('/', (req,rsp) => rsp.sendFile(__dirname + '/index.html'))


// ---------------------- database ----------------------

const clients = {};
// clients = {
//     <clientID>: {
//         'connection': <obj>,
//         'nickname': <string>,
//         'isAlive': true/false
//     },
//     <clientID>: {
//         'connection': <obj>
//         'nickname': <string>
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
//             {'clientID': ??, 'nickname': ??},
//             {'clientID': ??, 'nickname': ??},
//             ...
//         ],
//         'status': 'waiting' or 'started'
//     },
//     ...
// }

// ---------------------- handle request ----------------------

wsServer.on('request', (request) => {
    // when a user send a request to connect
    const connection = request.accept(null, request.origin);

    // configure the connection behavior
    connection.on('open', () => { console.log('opened!') })
    connection.on('close', () => { console.log('closed!') })
    connection.on('disconnect', () => { console.log('disconnected!') })
    connection.on('message', (message) => {
        const request = JSON.parse(message.utf8Data)
        console.log(request)

        // when a user send a request to create new game
        if (request.method === 'create') {
            const gameId = guid();
            games[gameId] = {
                'cardNum': 25,
                'cards': [],
                'clients': [],
                'status': 'waiting'
            }
            const payload = {
                'method': 'create',
                'gameId': gameId
            }
            try {
                connection.send(JSON.stringify(payload))
            } catch (err) {
                console.log(err)
            }


            // start broadcasting
            // broadcastGame();
        }

        // when a user send a request to join game
        if (request.method === 'join') {
            // update game
            const clientId = request.clientId
            const gameId = request.gameId;

            if (Object.hasOwn(games, gameId)) {
                const game = games[gameId];
                game.clients.push({
                    'clientId': clientId,
                    'nickname': clients[clientId].nickname
                });
                // notify join success
                const payload = {
                    'method': 'join',
                    'gameId': gameId
                };
                try {
                    clients[clientId].connection.send(JSON.stringify(payload));
                } catch (err) {
                    console.log(err)
                }

                broadcastGameUpdate(gameId);
            }
        }

        // if (request.method === 'update nickname'){
        //     const clientId = request.clientId;
        //     const nickname = request.nickname;
        //     clients[clientId].nickname = nickname;

        //     const payload = {
        //         'method': 'update nickname',
        //         'status': 'success',
        //         'nickname': nickname
        //     }
        //     clients[clientId].connection.send(JSON.stringify(payload));
        // }

        // when user request to click a card
        if (request.method === 'play') {
            const gameId = request.gameId;
            const cardId = request.cardId;
            games[gameId].cards[cardId].isClicked = !games[gameId].cards[cardId].isClicked;

            broadcastGameUpdate(gameId);
        }

        // when user request to leave game
        if (request.method === 'leave') {
            const clientId = request.clientId;
            const gameId = request.gameId;

            games[gameId].clients.every((c, i) => {
                if (c.clientId === clientId) {
                    games[gameId].clients.splice(i, 1);
                    return false;
                } else {
                    return true;
                }
            })

            // notify leave success
            const payload = {
                'method': 'leave',
                'status': 'success'
            };
            try {
                clients[clientId].connection.send(JSON.stringify(payload));
            } catch (err) {
                console.log(err)
            }

            // if no clinet in game, delete game
            if (games[gameId].clients.length === 0) {
                delete games[gameId];
            }

            broadcastGameUpdate(gameId);
        }

        // when user request to start game
        if (request.method === 'start') {
            const gameId = request.gameId;
            games[gameId].cards = initCards();
            games[gameId].status = 'started';

            broadcastGameUpdate(gameId);
        }

        // when user request to close the game
        if (request.method === 'close') {
            console.log('detect client closing!')
            // delete client from game and broadcast to game clients
            const gameId = request.gameId;
            const clientId = request.clientId;
            // delete client from game if necessary
            if (gameId !== null) {
                games[gameId].clients.every((c, i) => {
                    if (c.clientId === clientId) {
                        games[gameId].clients.splice(i, 1);
                        return false;
                    } else {
                        return true;
                    }
                })
                // if no clinet in game, delete game
                if (games[gameId].clients.length === 0) {
                    delete games[gameId];
                }
            }

            // delete client connection
            delete clients[clientId];

            broadcastGameUpdate(gameId);
        }

        if (request.method === 'heartbeat') {
            const clientId = request.clientId;
            clients[clientId].isAlive = true;
        }
    })

    // save connection to database and notify user
    const clientId = guid();
    clients[clientId] = {
        'connection': connection,
        'nickname': clientId,
        'isAlive': true,
    }
    const payload = {
        'method': 'connect',
        'clientId': clientId
    }
    try {
        connection.send(JSON.stringify(payload))
    } catch (err) {
        console.log(err)
    }
    broadcastWaitingGame();
})


// ---------------------- heleper functions ----------------------

function broadcastGameUpdate(gameId) {
    const game = games[gameId];
    if (game === undefined) {
        return;
    }
    const payload = {
        'method': 'update',
        'game': game
    }
    game.clients.forEach(c => {
        try {
            clients[c.clientId].connection.send(JSON.stringify(payload));
        } catch (err) {
            console.log(err)
        }
    })
}

// function broadcastGame(){
//     for (const [gameId, game] of Object.entries(games)) {
//         const payload = {
//             'method': 'update',
//             'game': game
//         }
//         game.clients.forEach(c => {
//             clients[c.clientId].connection.send(JSON.stringify(payload));
//         })
//     }
//     setTimeout(broadcastGame, 1000);
// }

function broadcastWaitingGame() {
    let gameIds = []
    Object.entries(games).forEach(([gameId, game]) => {
        if (game.status === 'waiting') {
            gameIds.push(gameId);
        }
    })

    const payload = {
        'method': 'waiting',
        'numOnlineClients': Object.keys(clients).length,
        'gameIds': gameIds,
    }
    // TODO: performance issue, only braodcast to clients not in game
    Object.values(clients).forEach(v => {
        try {
            v.connection.send(JSON.stringify(payload));
        } catch (err) {
            console.log(err)
        }
    })

    setTimeout(broadcastWaitingGame, 1000);
}

function heartBeat() {
    // close and delete all dead connections
    Object.entries(clients).forEach(([k, v]) => {
        if (v.isAlive === false) {
            v.connection.close();
            delete clients[k];
        } else {
            v.isAlive = false;
        }
    })

    // send heartbeat
    const payload = {
        'method': 'heartbeat',
    }
    Object.values(clients).forEach(c => {
        try {
            c.connection.send(JSON.stringify(payload));
        } catch (err) {
            console.log(err)
        }
    })

    setTimeout(heartBeat, 10000)
}

heartBeat();

function initCards() {
    const numCards = 25;

    let words = ["清明上河图", "盾", "忽略", "愤怒", "扇子", "二维码", "硫酸", "舌头", "壁咚", "大不列颠", "内裤", "屏保", "特工", "梧桐树", "杀手", "钓鱼岛", "戒指", "国旗", "小麦", "雨", "咖啡", "灰", "易拉罐", "玻璃", "裸体", "便当", "世界杯", "锣", "定时", "空军", "身体", "中国", "游戏", "作文", "工具", "胶带", "纺织", "缝隙", "香港脚", "太上皇", "阿胶", "风车", "信号", "矬子", "腋窝", "瓢虫", "学位", "西瓜", "月饼", "充电宝", "袋子", "水杯", "女人", "电话", "匪徒", "螳螂", "佛跳墙", "仙人掌", "剑", "和尚", "功夫", "白酒", "猫", "溪水", "首饰", "韭菜", "笼子", "细胞", "发射", "熄火", "鲸", "茶叶", "游泳", "咳嗽", "杠杆", "墨菲定律", "屁", "妾", "火腿", "囧", "火烈鸟", "鸡爪", "环境", "酒吧", "长白山", "讽刺", "纸", "隧道", "洗澡", "鼻涕", "解放", "洞", "司机", "网", "暖壶", "粽子", "加湿器", "激情", "井", "法师", "红领巾", "窗帘", "门框", "衣架", "冰箱", "掌柜", "十字架", "罐", "辞海", "电脑", "星座", "苹果", "沙发", "蚂蚱", "高粱", "万年历", "语言", "过年", "聚会", "彩票", "行业", "天堂", "当铺", "大学", "街道", "比赛", "椅子", "鼻屎", "痣", "自拍杆", "脑", "生命", "滑雪", "标题", "夸张", "冥想", "电路", "钢琴", "箫", "标志", "私奔", "罚单", "姑娘", "摩天楼", "镜子", "伞", "药片", "唐僧", "臭豆腐", "笔", "磁场", "相框", "地板", "错误", "果汁", "俱乐部", "节奏", "噪音", "犀牛", "粉丝", "情况", "砖", "配方", "美少女战士", "凤凰", "瓢", "发动机", "头", "狗", "房间", "丑八怪", "壳", "电熨斗", "汗液", "烟", "树", "眼睛", "夕阳", "湖畔", "盖", "电缆", "牙齿", "结", "美国", "站台", "可可", "烟斗", "火鸡", "蛋", "京剧", "苏打水", "抽象派", "花痴", "酒店", "不动产", "砚台", "文章", "梦", "双胞胎", "二胎", "邻居", "旗袍", "英文", "脚趾", "警车", "速度", "袜子", "友谊", "整容", "黑板", "人行道", "炸鸡", "啤酒", "传单", "炮弹", "喇叭", "抽屉", "恐龙", "大雁", "瑜伽", "刺", "情人节", "思想", "孔雀", "侦探", "冬青", "榴莲", "舟", "山寨", "项链", "冷", "泳池", "悲伤", "天空", "大气层", "仙", "海马", "薯片", "汽车", "秤", "肚子", "牛", "吐鲁番", "手枪", "垫", "口腔", "病变", "妹妹", "玩具", "海豚", "枣", "蓝天", "孩子", "隔壁", "缴费", "可乐", "抛物线", "兔子", "亚洲", "橡皮泥", "拖拉机", "盘子", "勇气", "肥皂", "电", "脸", "钙", "目录", "摄像机", "北京", "冠军", "厨房", "象牙", "衣服", "面包", "瓶", "肉", "山楂", "信仰", "小明", "宽带", "太子妃", "馍", "垃圾", "茶几", "冬瓜", "发型", "数字", "电影", "油条", "四合院", "后空翻", "扭曲", "阿拉斯加", "蕾丝", "狼人", "球", "遥控器", "蜂蜜", "杂志", "白色", "康乃馨", "灵魂", "墨迹", "卧室", "床", "李白", "诗", "快递", "南美", "家居", "对号", "盒", "发电机", "客服", "糖", "港币", "动画片", "红楼梦", "奥特曼", "瓜子", "黑夜", "拉斯维加斯", "楼梯", "三文鱼", "自由女神", "伦敦", "电视", "版权", "停车场", "痤疮", "痔疮", "小怪兽", "马甲线", "水", "沙子", "帕金森", "驼背", "纤维", "雷", "香蕉", "星星", "马桶", "卫生纸", "龙", "根", "黄金", "云", "杀马特", "黄飞鸿", "甲壳虫", "彩虹", "馅饼", "队长", "实验", "招牌", "口水", "科学家", "潜水艇", "飞", "裙子", "钾", "露", "火箭", "发票", "开心果", "拖鞋", "葫芦娃", "加菲猫", "白骨精", "奶粉", "蚊子", "熊", "美白", "设置", "菩提", "僵尸", "诅咒", "堂吉诃德", "缝纫机", "维纳斯", "地域", "火星", "鼠标", "鱼香肉丝", "西藏", "布丁", "礼品", "背叛者", "醉", "坑", "牙刷", "房顶", "书包", "微波炉", "花生", "凳子", "表", "困", "把手", "衬衫", "黄瓜", "运气", "呼噜", "桥", "吸尘器", "口罩", "鸭子", "钟", "农药", "洗衣机"];

    let colors = [
        "red", "red", "red", "red", "red", "red", "red", "red", "red",
        "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue",
        "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow",
        "grey"
    ]
    shuffle(words);
    shuffle(colors);

    cards = [];
    for (let i = 0; i < numCards; i++) {
        cards.push({
            'word': words[i],
            'color': colors[i],
            'isClicked': false
        })
    }

    return cards;
}

function S4() { return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1); }
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();

// ref: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length, randomIndex;

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

