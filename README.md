# Codenames

## Run Locally
```
$ npm install
$ node index.js
# goto http://127.0.0.1:8081/ in browser
```

## TODO
- [ ] room name and player name
- [ ] user sign up
- [ ] delete game
- [ ] decrease broadcast frequency
- [ ] remove styling
- [ ] mobile page

- [ ] turn logic
- [ ] overlap word forbidden

---

- [x] shuffle game & color when game created
- [x] detect user closing tab (remove client from game and its connection)
- [x] require user to leave game before create/join a new game (weird blinking when create & join a game without leaving previous game)
- [x] show/hide map
- [x] shuffle cards without creating a new game
- [x] auto join game after create
- [x] show ongoing games, remove game when all users disconnect
- [x] undo click card
- [x] games waiting for join / started (hide from homepage)
    when game created, it should be 
        in waiting status
        shown on index
    when game started, it should be 
        in started status
        hidden from index

    when i've joined a game
    when i click start game
    the game should be in started status and hide on index