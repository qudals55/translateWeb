const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Room = require('../schemas/room');
const Chat = require('../schemas/chat');
const User = require('../schemas/user');
const Review = require('../schemas/review')
const {
  Translate
} = require('@google-cloud/translate');
const projectId = 'propane-will-234405';
const keyFilename = '/home/gongbyeongmin/speechkey.json';



// Creates a client

const router = express.Router();

// 초기 로그인 화면
router.get('/', async (req, res, next) => {
  try {
    const reviews = await Review.find({}).sort('createdAt');
    res.render('login', {
      title: '로그인',
      reviews: reviews,
      error: req.flash('loginError')
    });

  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 로그인 페이지에서 작성한 로그인 정보 전송
router.post('/main', async (req, res, next) => {
  try {
    if (!req.body.userid || !req.body.lang) {
      const reviews = await Review.find({}).sort('createdAt');
      if (!req.body.userid) {
        req.flash('loginError', '닉네임을 입력해주세요.');
        res.render('login', {
          title: '로그인',
          reviews: reviews,
          error: req.flash('loginError'),
        });
      } else if (!req.body.lang) {
        req.flash('langError', '언어를 입력해주세요.');
        res.render('login', {
          title: '로그인',
          reviews: reviews,
          error: req.flash('langError'),
        });
      };
      return;
    }


    const user = new User({
      user: req.session.color,
      id: req.body.userid,
      lang: req.body.lang,
    });
    // 아이디 등록
    await user.save();
    // 사용자 언어 설정
    res.redirect('/main');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 메인 페이지 접속
router.get('/main', async (req, res, next) => {
  try {
    let getRooms = [];
    const rooms = await Room.find({});
    for (room of rooms) {
      getRooms.push(room);
      const users = await User.find({
        room: room._id
      }).sort('createdAt');
      getRooms.push(users);
      getRooms.push(users.length);
    };

    res.render('main', {
      rooms: getRooms,
      title: 'GIF 채팅방',
      error: req.flash('roomError')
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 방 생성 페이지 접속
router.get('/room', (req, res) => {
  res.render('room', {});
});

// 방 생성 시
router.post('/room', async (req, res, next) => {
  try {
    if (!req.body.title) {
      req.flash('titleError', '방 제목을 입력해주세요.');
      res.render('room', {
        error: req.flash('titleError')
      });
      return;
    }

    const user = await User.findOne({
      user: req.session.color,
    });

    const room = new Room({
      title: req.body.title,
      max: req.body.max,
      owner: user.id,
      ownerlang: user.lang,
      password: req.body.password,
    });
    const newRoom = await room.save();
    const io = req.app.get('io');
    io.of('/room').emit('newRoom', newRoom);
    res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
  } catch (error) {
    console.error(error);
    next(error);
  }
});





// 방 입장 시

router.get('/room/:id', async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id
    });

    const io = req.app.get('io');
    if (!room) {
      req.flash('roomError', '존재하지 않는 방입니다.');
      let getRooms = [];
      const rooms = await Room.find({});
      for (getroom of rooms) {
        getRooms.push(getroom);
        const users = await User.find({
          room: getroom._id
        }).sort('createdAt');
        getRooms.push(users);
        getRooms.push(users.length);
      };

      res.render('main', {
        rooms: getRooms,
        title: 'GIF 채팅방',
        error: req.flash('roomError'),
      });
      return;
    }
    if (room.password && room.password !== req.query.password) {
      req.flash('passwordError', '비밀번호가 틀렸습니다.');
      let getRooms = [];
      const rooms = await Room.find({});
      for (getroom of rooms) {
        getRooms.push(getroom);
        const users = await User.find({
          room: getroom._id
        }).sort('createdAt');
        getRooms.push(users);
        getRooms.push(users.length);
      };

      res.render('main', {
        rooms: getRooms,
        title: 'GIF 채팅방',
        error: req.flash('passwordError'),
      });
      return;
    }
    const { rooms } = io.of('/chat').adapter;
    if (rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length) {
      req.flash('exceedError', '허용 인원이 초과하였습니다.');
      let getRooms = [];
      const rooms = await Room.find({});
      for (getroom of rooms) {
        getRooms.push(getroom);
        const users = await User.find({
          room: getroom._id
        }).sort('createdAt');
        getRooms.push(users);
        getRooms.push(users.length);
      };

      res.render('main', {
        rooms: getRooms,
        title: 'GIF 채팅방',
        error: req.flash('exceedError'),
      });
      return;
    }

    const chats = await Chat.find({
      room: room._id
    }).sort('createdAt');

    await User.updateOne({
      user: req.session.color
    }, {
      $set: {
        room: room._id
      }
    });
    const user = await User.findOne({
      user: req.session.color,
    }, {
      lang: true,
      id: true,
      _id: false,
    });

    var getDb = [];
    for (originchat of chats) {

      var needchat = originchat.chat.split('=');
      var needindex = needchat.findIndex(function (e) {
        return e == user.lang;
      });

      if (needindex == -1) {
        needindex++;
        const translate = new Translate({
          projectId,
          keyFilename,
        });
        let [translations] = await translate.translate(needchat[needindex + 1], user.lang);
        translations = Array.isArray(translations) ? translations : [translations];
        getChat = translations;
      } else {
        getChat = needchat[needindex + 1];
      };

      const chat = ({
        room: req.params.id,
        user: originchat.user,
        id: originchat.id,
        lang: user.lang,
        chat: getChat,
      });

      getDb.push(chat);
    };
    if (rooms && rooms[req.params.id] && rooms[req.params.id].length) {
      io.of('/room').emit('joinRoom', {
        roomId: req.params.id,
        user: user,
        count: rooms[req.params.id].length + 1,
      });
    };
    return res.render('chat', {
      findlang: user,
      room,
      getroomId: req.params.id,
      title: room.title,
      owner: room.owner,
      chats: getDb,
      user: req.session.color,
    });

  } catch (error) {
    console.error(error);
    return next(error);
  }
});

router.get('/download/:id', async (req, res, next) => {

  const user = await User.findOne({
    user: req.session.color,
  });

  const chats = await Chat.find({
    room: req.params.id,
  }).sort('createdAt');

  let getDb = '';
  for (originchat of chats) {

    var needchat = originchat.chat.split('=');
    var needindex = needchat.findIndex(function (e) {
      return e == user.lang;
    });

    if (needindex == -1) {
      needindex++;
      const translate = new Translate({
        projectId,
        keyFilename,
      });
      let [translations] = await translate.translate(needchat[needindex + 1], user.lang);
      translations = Array.isArray(translations) ? translations : [translations];
      getChat = translations;
    } else {
      getChat = needchat[needindex + 1];
    };

    getDb += originchat.id + ': ' + getChat + '\n' + '\n';
  };
  try {
    res.setHeader('Content-type', 'text/plain');
    res.setHeader('Content-disposition', 'attachment; filename=record.txt');
    res.send(getDb);
  } catch (error) {
    console.error(error);
    next(error);
  };
});



router.delete('/room/:id', async (req, res, next) => {
  try {

    await Chat.deleteMany({
      room: req.params.id
    });
    await User.deleteMany({
      room: req.params.id
    });

    await Room.deleteOne({
      _id: req.params.id
    });


    res.send('ok');
    setTimeout(() => {
      req.app.get('io').of('/room').emit('removeRoom', req.params.id);
    }, 1000);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


let translations = async function processtrans(allLangs, text) {

  const translate = new Translate({
    projectId,
    keyFilename,
  });

  // Creates a client


  const alltargets = allLangs.map(e => {
    return e.lang;
  });
  const targets = alltargets.filter((item, index) => alltargets.indexOf(item) === index);

  let str = '';
  for (const target of targets) {
    let [translations] = await translate.translate(text, target);
    translations = Array.isArray(translations) ? translations : [translations];
    str += target + '=' + translations + '=';
  }
  return str;
};


router.post('/room/chat', async (req, res, next) => {
  const restore = req.body.reviews.split(':');
  const review = new Review({
    id: restore[0],
    comments: restore[1]
  });
  await review.save();
  res.send('ok');
});




router.post('/room/:id/chat', async (req, res, next) => {

  const room = await Room.findOne({
    _id: req.params.id
  });

  const user = await User.findOne({
    user: req.session.color
  });


  const allLangs = await User.find({
    $and: [{
      room: room._id
    }, {
      lang: {
        $ne: user.lang
      }
    }]
  }, {
    lang: true,
    _id: false
  });

  let chats = user.lang + '=' + req.body.chat + '=';

  translations(allLangs, req.body.chat).then(function (result) {
    chats += result;
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color,
      id: user.id,
      lang: user.lang,
      chat: chats,
    });
    return chat.save().catch((err) => console.err(err));
  }).then((chat) => {
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  }).catch((error) => {
    console.error(error);
    next(error);
  });

});


fs.readdir('uploads', (error) => {
  if (error) {
    console.error('uploads 폴더가 없어 uploads 폴더를 생성합니다.');
    fs.mkdirSync('uploads');
  }
});
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'uploads/');
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname, ext) + new Date().valueOf() + ext);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
});
router.post('/room/:id/gif', upload.single('gif'), async (req, res, next) => {
  try {
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color,
      gif: req.file.filename,
    });
    await chat.save();
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
});



module.exports = router;
