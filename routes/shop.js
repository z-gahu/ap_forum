const router = require("express").Router();

// app.get("/shop/shirts", (요청, 응답) => {
//     응답.send(" 셔츠 파는 페이지 입니다.");
//   });

//   app.get("/shop/pants", (요청, 응답) => {
//     응답.send(" 바지 파는 페이지 입니다.");
//   });

router.get("/shirts", (요청, 응답) => {
  응답.send(" 셔츠 파는 페이지 입니다.");
});

router.get("/pants", (요청, 응답) => {
  응답.send(" 바지 파는 페이지 입니다.");
});

module.exports = router;
