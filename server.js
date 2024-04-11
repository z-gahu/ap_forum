const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const { MongoClient, ObjectId } = require("mongodb");

let db;
const url = process.env.MONGO_URL;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(8080, () => {
  console.log("http://localhost:8080 에서 서버 실행중");
});

app.get("/", (요청, 응답) => {
  응답.sendFile(__dirname + "/index.html");
});

app.get("/news", (요청, 응답) => {
  응답.send("오늘 비옴");
});

app.get("/shop", (요청, 응답) => {
  응답.send("쇼핑페이지입니다.");
});

app.get("/list", async (요청, 응답) => {
  let result = await db.collection("post").find().toArray();
  // 응답.render("list.ejs");
  응답.render("list.ejs", { 글목록: result });
});

app.get("/write", (요청, 응답) => {
  응답.render("write.ejs");
});

app.post("/add", async (요청, 응답) => {
  console.log(요청.body);

  try {
    // 제목이 비어있으면 저장안함
    if (요청.body.title == "") {
      응답.send("제목입력 안했는데?");
    } else {
      await db
        .collection("post")
        .insertOne({ title: 요청.body.title, content: 요청.body.content });
      응답.redirect("/list");
    }
  } catch (e) {
    console.log(e);
    응답.status(500).send("서버에러남");
  }
});

app.get("/detail/:id", async (요청, 응답) => {
  try {
    console.log(요청.params);
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(요청.params.id) });
    console.log(result);
    if (result == null) {
      응답.status(404).send("이상한 url입력함");
    }
    응답.render("detail.ejs", { result: result });
  } catch (e) {
    console.log(e);
    응답.status(404).send("이상한 url입력함");
  }
});

app.get("/edit/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(요청.params.id) });
  console.log(result);
  응답.render("edit.ejs", { result: result });
});

app.post("/edit", async (요청, 응답) => {
  try {
    console.log(요청.body);
    let result = await db
      .collection("post")
      .updateOne(
        { _id: new ObjectId(요청.body.id) },
        { $set: { title: 요청.body.title, content: 요청.body.content } }
      );
    console.log(result);
    응답.redirect("/list");
  } catch (e) {
    console.log("저장실패");
  }

  // let result = await db
  //   .collection("post")
  //   .updateOne({ _id: 1 }, { $inc: { like: 1 } });
  // console.log(result);
});

app.post("/abc", async (요청, 응답) => {
  console.log("안녕");
  console.log(요청.params);
});

app.get("/abc", async (요청, 응답) => {
  // console.log(요청.params);
  console.log(요청.query);
});

app.delete("/delete", async (요청, 응답) => {
  //db에 있는 글 삭제
  console.log(요청.query);
  try {
    await db
      .collection("post")
      .deleteOne({ _id: new ObjectId(요청.query.docid) });
    응답.send("삭제완료");
  } catch (error) {
    console.log("삭제실패");
  }
});

// app.get("/list/1", async (요청, 응답) => {
//   // 1~5번글을 찾아서 result변수에 저장
//   let result = await db.collection("post").find().limit(5).toArray();
//   // 응답.render("list.ejs");
//   응답.render("list.ejs", { 글목록: result });
// });

// app.get("/list/2", async (요청, 응답) => {
//   // 1~5번글을 찾아서 result변수에 저장
//   let result = await db.collection("post").find().skip(5).limit(5).toArray();
//   // 응답.render("list.ejs");
//   응답.render("list.ejs", { 글목록: result });
// });

app.get("/list/:id", async (요청, 응답) => {
  // 1~5번글을 찾아서 result변수에 저장

  let result = await db
    .collection("post")
    .find()
    .skip((요청.params.id - 1) * 5)
    .limit(5)
    .toArray();
  // 응답.render("list.ejs");
  응답.render("list.ejs", { 글목록: result });
});

app.get("/list/next/:id", async (요청, 응답) => {
  // 1~5번글을 찾아서 result변수에 저장

  let result = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(요청.params.id) } })
    .limit(5)
    .toArray();
  // 응답.render("list.ejs");
  응답.render("list.ejs", { 글목록: result });
});
