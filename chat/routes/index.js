const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Room = require('../schemas/room');
const Chat = require('../schemas/chat');
const User = require('../schemas/user');
const {Translate} = require('@google-cloud/translate');
const projectId = 'propane-will-234405';
const keyFilename = '/Users/audrey/Desktop/gong/speech/speechkey_origin.json';

// Creates a client

const router = express.Router();

// 초기 로그인 화면
router.get('/', async (req, res, next) => {
  try {
    res.render('login', {
      title: '로그인',
      error: req.flash('loginError')
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
})

// 로그인 페이지에서 작성한 로그인 정보 전송
router.post('/main', async (req, res, next) => {
  try {
    if (req.body.userid == '') {
      req.flash('loginError', '아이디를 입력해주세요.');
      return res.redirect('/');
    }

    await User.deleteMany({
      user: req.session.color
    });

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
    console.log(req.query.valid);
    const rooms = await Room.find({});
    res.render('main', {
      rooms,
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
  res.render('room', {
    title: 'GIF 채팅방 생성'
  });
});

// 방 생성 시
router.post('/room', async (req, res, next) => {
  try {
    const room = new Room({
      title: req.body.title,
      max: req.body.max,
      owner: req.session.color,
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
      return res.redirect('/');
    }
    if (room.password && room.password !== req.query.password) {
      req.flash('roomError', '비밀번호가 틀렸습니다.');
      return res.redirect('/');
    }
    const { rooms } = io.of('/chat').adapter;
    if (rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length) {
      req.flash('roomError', '허용 인원이 초과하였습니다.');
      return res.redirect('/');
    }
    const chats = await Chat.find({
      room: room._id
    }).sort('createdAt');

    await User.update({user: req.session.color}, { $set: { room: room._id }});

    const user = await User.findOne({
      user: req.session.color,
    });

    return res.render('chat', {
      findlang: user.lang,
      room,
      title: room.title,
      chats,
      user: req.session.color,
    });

  } catch (error) {
    console.error(error);
    return next(error);
  }
});

router.delete('/room/:id', async (req, res, next) => {
  try {
    await Room.remove({
      _id: req.params.id
    });
    await Chat.remove({
      room: req.params.id
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

async function uniqueLanguageFind(allLangs) {

  var targets = allLangs.map(async function (e) { return e.lang; });
  targets.filter(async (item, index) => targets.indexOf(item) === index); 
  return targets;
}

var targets = ['ko', 'ja', 'en'];

let translations = async function processtrans(target, text) {

  // Creates a client
  const translate = new Translate({
    // projectId,
    // keyFilename,
  });
  
  // const alltargets = allLangs.map(e => { return e.lang; });


  // let str = '';
  // for (const target of targets) {
  //   str += '(' + target + ')' + '        ';
  //   let [translations] = await translate.translate(text, target);
  //   translations = Array.isArray(translations) ? translations : [translations];
  //   str += translations + '        ';
  // }
  let [translations] = await translate.translate(text, target);
  return translations;
}


router.post('/room/:id/chat', async (req, res, next) => {

  const room = await Room.findOne({ _id: req.params.id });
  const user = await User.findOne({
    user: req.session.color
  });

  // let chats = req.body.chat + '  ';
  // console.log(targets.find(l=>{return l==user.lang}));
  // if(targets.find(l => { return l == user.lang})==undefined)
  // {
  //   targets.push(user.lang);
  // }
  console.log(targets);
  for(target of targets) {
    result = await translations(target, req.body.chat);
    try {
      // chats += result;
      const chat = new Chat({
        room: req.params.id,
        user: req.session.color,
        id: user.id,
        lang: target,
        chat: result,
      });
      
      await req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
      chat.save().catch((err) => console.err(err));

    }
    catch(error) {
        console.error(error);
        next(error);
    }
  }
  
  res.send('ok');

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
