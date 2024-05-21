const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");
const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");

const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SCERET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()); // 업로드할 이미지 파일명 설정
    },
  }),
});

app.use(methodOverride("_method"));
app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false, // 유저가 서버로 요청할 때마다 세션갱신할지 여부
    saveUninitialized: false, // 로그인을 안해도 세션을 만들지 여부
    cookie: { maxAge: 60 * 60 * 1000 }, // 세션유지시간
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      dbName: "forum",
    }),
  })
);
app.use(passport.session());

app.use("/list", (요청, 응답, next) => {
  console.log(new Date());
  next();
});

app.use("/shop", require("./routes/shop.js"));
app.use("/", require("./routes/board.js"));

let connectDB = require("./database.js");

let db;
connectDB
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(process.env.PORT, () => {
  console.log("http://localhost:8080 에서 서버 실행중");
});

function checkLogin(요청, 응답, next) {
  if (!요청.user) {
    응답.send("로그인하세요");
  }
  next(); // 미들웨어 코드 실행 끝났으니 다음으로 이동해주세요
}

// app.use('/URL',checkLogin); // 모든 api 에 미들웨어 적용

app.get("/", (요청, 응답) => {
  // 함수(요청, 응답);
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

app.post("/add", upload.single("img1"), async (요청, 응답) => {
  try {
    // 이미지 업로드 에러처리
    // upload.single("img1")(요청, 응답, (err) => {
    //   if (err) return 응답.send("업로드 에러");
    // });
    // console.log("응답.file -> ", 응답.file);

    // 제목이 비어있으면 저장안함
    if (요청.body.title == "") {
      응답.send("제목입력 안했는데?");
    } else {
      await db.collection("post").insertOne({
        title: 요청.body.title,
        content: 요청.body.content,
        img: 요청.file.location,
      });
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

passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    // 제출한 아이디/비번 검사하는 코드
    let result = await db
      .collection("user")
      .findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: "아이디가 디비에 없음" }); // 회원인증 실패시엔 false를 넣어줘야함
    }
    // 비번 비교(저장된해싱된 패스워드 == 입력한 비번:해싱필요)
    const 비번비교 = await bcrypt.compare(입력한비번, result.password);
    if (비번비교) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

// 로그인시 세션만들기
passport.serializeUser((user, done) => {
  console.log("user:", user);
  process.nextTick(() => {
    // 내부코드를 비동기적으로 처리해줌
    done(null, { id: user._id, username: user.username }); // 요청.logIn()을 쓰면 자동실행됨
  }); // 위 내용을 적어서 세션 document를 DB or 메모리에 발행해줌
});

// 쿠키를 분석해주는 역할
passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  // 쿠키가 이상없으면 현재 로그인된 유저정보를 알려줌
  process.nextTick(() => {
    done(null, result); // result 에 넣은게 요청.user에 들어감
  });
});

// 아이디/비번 외에 다른것도 제출받아서 검증가능 passReqToCallback 옵션
// 실행하고 싶으면 passport.authenticate('local')() 사용

app.post("/login", checkPassword, async (요청, 응답, next) => {
  // 제출한 아이디 비번이 디비에 있는지 확인하고 있으면 세션만들어줌
  passport.authenticate("local", (error, user, info) => {
    if (error) return 응답.status(500).json(error);
    if (!user) return 응답.status(401).json(info.message); // 위에 적은 메세지
    요청.logIn(user, (err) => {
      if (err) return next(err);
      응답.redirect("/"); //로그인 완료시 실행할 코드
    }); // 세션 만들기시작
  })(요청, 응답, next);
  // - 콜백함수의 첫째 파라미터는 뭔가 에러시 뭔가 들어옴
  // - 둘째 파라미터는 아이디/비번 검증 완료된 유저정보가 들어옴
  // - 셋째는 아이디/비번 검증 실패시 에러메세지가 들어옴
});

app.get("/login", async (요청, 응답) => {
  console.log(요청.user);
  응답.render("login.ejs");
});

app.get("/register", (요청, 응답) => {
  응답.render("register.ejs");
});

function checkPassword(요청, 응답, next) {
  if (요청.body.username == "" || 요청.body.password == "") {
    응답.send("그러지마세요");
  } else {
    next();
  }
}

app.post("/register", async (요청, 응답) => {
  let 해시 = await bcrypt.hash(요청.body.password, 10);
  // console.log(해시);

  // 회원가입 시켜줄 때 중복 아이디로 가입하는걸 막고 싶다.
  const user = await db
    .collection("user")
    .findOne({ username: 요청.body.username });
  if (user) {
    console.log("중복유저 있음");
  } else {
    console.log("중복유저 없음");
    await db.collection("user").insertOne({
      username: 요청.body.username,
      password: 해시,
    });
    응답.redirect("/");
  }
});

// app.get("/shop/shirts", (요청, 응답) => {
//   응답.send(" 셔츠 파는 페이지 입니다.");
// });

// app.get("/shop/pants", (요청, 응답) => {
//   응답.send(" 바지 파는 페이지 입니다.");
// });

// app.get("/board/sub/sports", checkLogin, (요청, 응답) => {
//   응답.send("스포츠 게시판");
// });
// app.get("/board/sub/game", checkLogin, (요청, 응답) => {
//   응답.send("게임 게시판");
// });

app.get("/search", async (요청, 응답) => {
  console.log(요청.query.val);
  // let result = await db
  //   .collection("post")
  //   .find({ title: 요청.query.val })
  //   .toArray();

  let result = await db
    .collection("post")
    .find({ $text: { $search: "안녕" } })
    .toArray();
  // .explain("executionStats"); // 실행계획

  console.log("result", result);
  응답.render("search.ejs", { 글목록: result });
});
