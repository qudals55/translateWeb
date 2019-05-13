const SocketIO = require('socket.io');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cookie = require('cookie-signature');
const User = require('./schemas/user');

module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, { path: '/socket.io' });

  app.set('io', io);
  const room = io.of('/room');
  const chat = io.of('/chat');
  const root = io.of('/');

  io.use((socket,next)=>{
    cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res || {}, next);
  })

  
  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res, next);
  });

 

  room.on('connection', (socket) => {
    console.log('room 네임스페이스에 접속');
    socket.on('disconnect', () => {
      console.log('room 네임스페이스 접속 해제');
    });
  });

  chat.on('connection', async (socket) => {
    console.log('chat 네임스페이스에 접속');
    const req = socket.request;
    const { headers: { referer } } = req;
    const roomId = referer
      .split('/')[referer.split('/').length - 1]
      .replace(/\?.+/, '');
    user = await User.findOne({user: req.session.color});
    socket.join(roomId);
    socket.to(roomId).emit('join', { 
      user: 'system',
      chat: `${user.id}님이 입장하셨습니다.`,
    });

    socket.on('disconnect', async () => {
      console.log('접속 해제');
      socket.leave(roomId);
      
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom ? currentRoom.length : 0;
      await User.update({user: req.session.color}, { $unset: { room: 1 }});
      user = await User.findOne({user: req.session.color});
      if (userCount === 0) {
        axios.delete(`https://34.83.45.215:443/room/${roomId}`)
          .then(() => {
            console.log('방 제거 성공');
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        socket.to(roomId).emit('exit', {
          user: 'system',
          chat: `${user.id}님이 퇴장하셨습니다.`,
        });
        
      }
    });
  });

  root.on('connection', function (socket){
    function log(){
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
      
    socket.on('create or join', function (message) {
          var room = message.room;
  
          socket.room = room;
          var participantID = message.from;
          // configNameSpaceChannel(participantID);
          socket.join(room);
      var numClients = socket.adapter.rooms[room].length;
      console.log('Room ' + room + ' has ' + numClients + ' client(s)');
      console.log('Request to create or join room', room);
  
      if (numClients == 1){
        socket.emit('created', room);
      } else {
        root.to(room).emit('join', room);
        socket.emit('joined', room);
      }
    });
  
  });
  io.of(/^\/user\/[a-f0-9\-]+/).on('connection', function (socket){
    socket.on('message', function (message) {
        // Send message to everyone BUT sender
        // console.log('num client :', Object.keys(socketNamespace.clients()).length);
        socket.broadcast.emit('message', message);
        // console.log('broadcast :', socket.nsp.name, message.type, message.from, message.dest);
    });
  });
};
