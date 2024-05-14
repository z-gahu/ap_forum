const router = require("express").Router();

function checkLogin(요청, 응답, next) {
  if (!요청.user) {
    응답.send("로그인하세요");
  }
  next(); // 미들웨어 코드 실행 끝났으니 다음으로 이동해주세요
}

router.get("/board/sub/sports", checkLogin, (요청, 응답) => {
  응답.send("스포츠 게시판");
});
router.get("/board/sub/game", checkLogin, (요청, 응답) => {
  응답.send("게임 게시판");
});

module.exports = router;
