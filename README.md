# Codenames

## Run Locally
```
$ npm install
$ node index.js
# goto http://127.0.0.1:8081/ in browser
```

## TODO
- [ ] remove game when all users disconnect
- [ ] auto join game after create

---

- [x] shuffle game & color when game created
- [x] detect user closing tab (remove client from game and its connection)
- [x] require user to leave game before create/join a new game (weird blinking when create & join a game without leaving previous game)
- [x] show/hide map
- [x] shuffle cards without creating a new game
