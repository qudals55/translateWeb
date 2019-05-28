const SocketIO = require('socket.io');
const redis = require('socket.io-redis');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cookie = require('cookie-signature');
const User = require('./schemas/user');


const bindListeners = (io) => {
  io.on('connection', (socket) => {
    console.log(`${socket.id} connected`);

  })
}


module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, {
    transports: ['websocket']
  });
  app.set('io', io);

  const room = io.of('/room');
  const chat = io.of('/chat');
  const root = io.of('/');
  io.adapter(redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    requestsTimeout: 3000,
  }));
  bindListeners(io);
  io.use((socket, next) => {
    cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res || {}, next);
  })
  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
  });





  room.on('connection', async (socket) => {
    console.log('room 네임스페이스에 접속');


    socket.on('disconnect', () => {
      console.log('room 네임스페이스 접속 해제');
    });
  });



  chat.on('connection', async (socket) => {


    const req = socket.request;
    const user = await User.findOne({
      user: req.session.color
    });

    const roomId = user.room;
    chat.adapter.remoteJoin(socket.id, roomId, (err) => {
      if (err) {
        console.log(err);
      } 
    });
    socket.to(roomId).emit('join', {
      user: 'system',
      chat: `${user.id}님이 입장하셨습니다.`,
    });

    socket.on('disconnect', async () => {

      console.log('접속 해제');
      await chat.adapter.clients([roomId], (err, clients) => {
        console.log('Now room count: ', clients.length);
        if(err){
          console.log(err);
        } else{
        if (clients.length === 0) {
          axios.delete(`https://localhost:443/room/${roomId}`)
            .then(() => {
              console.log('방 제거 성공');
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          io.of('/room').emit('leaveRoom', {
            roomId: roomId,
            user: user,
            count: clients.length,
          });

          socket.to(roomId).emit('exit', {
            user: 'system',
            chat: `${user.id}님이 퇴장하셨습니다.`,
          });
        };
      };
      });
  
  
      await User.deleteOne({
        user: req.session.color
      });

      await req.session.destroy((err) =>{
        if(err){
          console.log('session Not Delete');
          console.log(err); 
        }
        else{
          console.log('session Delete sucess');
        }
      });
    });
  });

  root.on('connection', async function (socket) {
    function log() {
      var array = [">>> Message from server: "];
      for (var i = 0; i < arguments.length; i++) {
        array.push(arguments[i]);
      }
      socket.emit('log', array);
    }

    socket.on('message', function (message) {
      log('Got message: ', message);
      socket.broadcast.to(socket.room).emit('message', message);
    });

    socket.on('create or join', async function (message) {
      var room = message.room;

      socket.room = room;
      var participantID = message.from;
      // configNameSpaceChannel(participantID);

      await root.adapter.remoteJoin(socket.id, socket.room, (err) => {
        if (err) {
          console.log(err);
        }
      });
      await root.adapter.clients([room], (err, clients) => {
        console.log('Now root room count: ', clients.length);
        var numClients = clients.length;
        if (numClients == 1) {
          socket.emit('created', room);
        } else {
          root.to(room).emit('join', room);
          socket.emit('joined', room);
        }
      });
    });

  });
  io.of(/^\/user\/[a-f0-9\-]+/).on('connection', function (socket) {
    socket.on('message', function (message) {
      // Send message to everyone BUT sender
      // console.log('num client :', Object.keys(socketNamespace.clients()).length);
      socket.broadcast.emit('message', message);
      // console.log('broadcast :', socket.nsp.name, message.type, message.from, message.dest);
    });
  });
};
