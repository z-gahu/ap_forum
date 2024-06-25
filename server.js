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

const { createServer } = require("http");
const { Server } = require("socket.io");
const server = createServer(app);
const io = new Server(server);

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
  // console.log(new Date());
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
    server.listen(process.env.PORT, () => {
      console.log("http://localhost:8080 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
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
  // console.log("리스트 결과:", result);
  // console.log("유저 결과:", 요청.user);
  응답.render("list.ejs", { 글목록: result, 유저: 요청.user });
});

app.get("/write", (요청, 응답) => {
  응답.render("write.ejs");
});

app.post("/add", upload.single("img1"), async (요청, 응답) => {
  // console.log(요청.user);
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
        img: 요청.file ? 요청.file.location : "",
        user: 요청.user._id, // 유저의아이디
        username: 요청.user.username, //
      });
      응답.redirect("/list");
    }
  } catch (e) {
    console.log(e);
    응답.status(500).send("서버에러남");
  }
});

// app.get("/detail/:id", async (요청, 응답) => {
//   try {
//     // console.log(요청.params);
//     let result = await db
//       .collection("post")
//       .findOne({ _id: new ObjectId(요청.params.id) });
//     console.log(result);
//     if (result == null) {
//       응답.status(404).send("이상한 url입력함");
//     }
//     응답.render("detail.ejs", { result: result });
//   } catch (e) {
//     console.log(e);
//     응답.status(404).send("이상한 url입력함");
//   }
// });

app.get("/detail/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(요청.params.id) });

  let result2 = await db
    .collection("comment")
    .find({ parentId: new ObjectId(요청.params.id) })
    .toArray();

  // console.log("글목록 detail 확인입니다.=============================",result2);
  응답.render("detail.ejs", { result: result, result2: result2 });
});

app.get("/edit/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(요청.params.id) });
  // console.log(result);
  응답.render("edit.ejs", { result: result });
});

app.post("/edit", async (요청, 응답) => {
  try {
    // console.log(요청.body);
    let result = await db.collection("post").updateOne(
      { _id: new ObjectId(요청.body.id), user: new ObjectId(요청.user._id) },
      {
        $set: {
          title: 요청.body.title,
          content: 요청.body.content,
          // user: 요청.user._id, // 유저의아이디
        },
      }
    );
    // console.log(result);
    응답.redirect("/list");
  } catch (e) {
    console.log("수정실패", e);
  }

  // let result = await db
  //   .collection("post")
  //   .updateOne({ _id: 1 }, { $inc: { like: 1 } });
  // console.log(result);
});

app.post("/abc", async (요청, 응답) => {
  // console.log("안녕");
  console.log(요청.params);
});

app.get("/abc", async (요청, 응답) => {
  // console.log(요청.params);
  console.log(요청.query);
});

app.delete("/delete", async (요청, 응답) => {
  //db에 있는 글 삭제
  // console.log("delete 실행: ", 요청.query, 요청.user._id);
  try {
    const deleteResult = await db.collection("post").deleteOne({
      _id: new ObjectId(요청.query.docid),
      user: new ObjectId(요청.user._id),
    });
    // console.log("삭제완료(deleteResult):", deleteResult);
    if (deleteResult.deletedCount === 0) {
      return 응답.status(404).send("error");
    } else {
      응답.send("삭제완료");
    }
  } catch (error) {
    console.log("삭제실패", error);
    응답.status(500).send("삭제에 실패했습니다.");
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
  // console.log("user:", user);
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
  // console.log(요청.user);
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
  // console.log(요청.query.val);
  // let result = await db
  //   .collection("post")
  //   .find({ title: 요청.query.val })
  //   .toArray();

  // let result = await db
  //   .collection("post")
  //   .find({ $text: { $search: "안녕" } })
  //   .toArray();
  // .explain("executionStats"); // 실행계획

  // search index( full text index)만들기 -> 속도 정확한 단어
  let 검색조건 = [
    {
      $search: {
        index: "title_index",
        text: { query: 요청.query.val, path: "title" },
      },
    },
    { $sort: { _id: 1 } }, //_id필드 정렬
    { $limit: 10 },
  ];
  let result = await db.collection("post").aggregate(검색조건).toArray();

  // console.log("result", result);
  응답.render("search.ejs", { 글목록: result });
});

app.post("/comment", async (요청, 응답) => {
  try {
    let result = await db.collection("comment").insertOne({
      content: 요청.body.content,
      writerId: new ObjectId(요청.user._id),
      writer: 요청.user.username,
      parentId: new ObjectId(요청.body.parentId),
    });
    응답.redirect("back"); // 이전페이지 detail 페이지
  } catch (error) {
    console.log(error);
  }
});

app.get("/chat/request", async (요청, 응답) => {
  //  db에 document 발행
  db.collection("chatroom").insertOne({
    member: [요청.user._id, new ObjectId(요청.query.writerId)], //[요청한 사람Id, 글쓴이]
    date: new Date(),
  });
  응답.redirect("/chat/list"); //채팅방 목록페이지이동
});

//채팅방 목록
app.get("/chat/list", async (요청, 응답) => {
  // 내가속한 채팅방만 꺼내오기
  let result = await db
    .collection("chatroom")
    .find({
      member: 요청.user._id,
    })
    .toArray();
  응답.render("chatList.ejs", { result: result });
});

//채팅방 상세
app.get("/chat/detail/:id", async (요청, 응답) => {
  try {
    // TODO 숙제 현재 로그인 중인 유저가 이 채팅방에 속해 있나 검사
    // console.log("채팅방상세 유저ID", 요청.params.id);

    //채팅방 id로 찾기
    let result = await db.collection("chatroom").findOne({
      _id: new ObjectId(요청.params.id),
    });
    응답.render("chatDetail.ejs", { result: result });
  } catch (error) {
    console.log(error);
  }
});

// 웹소켓 연결시 특성 코드 실행
io.on("connection", (socket) => {
  // 수신하는 코드(유저가 보낸것)
  socket.on("age", (data) => {
    console.log("유저가 보낸거", data);
  });

  // 서버-> 모든유저
  // io.emit("name", "kim"); // 모든 유저에게 전송

  socket.on("ask-join", (data) => {
    // room 기능 사용
    // socket.request.session 유저가 있는지 확인
    socket.join(data); //룸생성. 서버만 가능
  });

  socket.on("message-send", (data) => {
    // console.log(data);
    io.to(data.room).emit("message-broadcast", data.msg);
  });

  // 채팅기능만들기3(socket.io) 숙제
  // 실시간 채팅기능 만들어 오기
  // 1. 채팅방에 상세페이지 접속시 room에 넣어주기
  // 2. 유저가 메세지 전송하면 같은 룸에 전달
  // 참고) 유저 로그인 정보 출력도 가능
  // https://socket.io/how-to/use-with-express-session
  // socket.request.session 출력시 유저 로그인정보가 들어있음
  // 현재 메세지 보내는 유저가 누구인지 확인가능 -> 아마 쿠키를 전송해서 확인하는 방식
  // passport 안쓰면 웹소켓 메세지 전송시 쿠키도 전송해서 열어봐야 합니다.

  socket.on("ask-join", async (data) => {
    socket.join(data);
  });

  // 추가 작업 필요
  //   물론 자기랑 관련없는 room에 들어가려는 악성 유저도 있을텐데
  // 그건 여러분들이 룸 조인시켜주기 전에 DB조회부터 해보면 됩니다
  // 저번 시간에 언급했던 passport + socket.io 셋팅을 해놓으면
  // 서버에서 socket.request.session 이라고 출력해보면 현재 로그인된 유저 정보가 나옵니다.
  // 그래서 이런 현재 유저가 채팅방 document에 기재되어 있는지부터 확인하고 룸에 집어넣어봅시다.
});

app.get("/stream/list", (요청, 응답) => {
  응답.writeHead(200, {
    Connection: "keep-alive",
    "content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  setInterval(() => {
    응답.write("event: msg\n");
    응답.write("data: 바보1111\n\n");
  }, 1000);
});
