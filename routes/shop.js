const router = require("express").Router();
let connectDB = require("./../database.js");

let db;
connectDB
  .then((client) => {
    console.log("db연결 성공");
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

// app.get("/shop/shirts", (요청, 응답) => {
//     응답.send(" 셔츠 파는 페이지 입니다.");
//   });

//   app.get("/shop/pants", (요청, 응답) => {
//     응답.send(" 바지 파는 페이지 입니다.");
//   });

router.get("/shirts", async (요청, 응답) => {
  let test = await db.collection("post").find().toArray();
  console.log(test);
  응답.send(" 셔츠 파는 페이지 입니다.");
});

router.get("/pants", (요청, 응답) => {
  응답.send(" 바지 파는 페이지 입니다.");
});

module.exports = router;
