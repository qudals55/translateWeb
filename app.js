const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const ColorHash = require('color-hash');
const helmet = require('helmet');
const hpp = require('hpp');
const RedisStore = require('connect-redis')(session);
require('dotenv').config();
const fs = require('fs');
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const https = require('https');

const webSocket = require('./socket');
const indexRouter = require('./routes');
const connect = require('./schemas');


const app = express();
connect();

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};




//redis hosting, pm2는 멀티코어를 사용하는데 하나의 코어가 여러 환경적 이유로 인해서 꺼질수 있다.
//그러면 원래 가지고 있던 세션, req.session.color등 여러개의 코어가 공유하던 세션이 날라가버리게 되서 채팅을 할 수 가없다.
//redis를 사용하여 세션을 디비화 시키면 하나의 서버가 꺼지더라도 모든 서버가 꺼지지 않는 이상 reids 디비에 저장된다.
//모든 서버를 종료시키면 redis에 저장되있던 세션은 모두 사라져서 보안적으로 문제도 없다.
// 밑에서 session을 디비에 저장하기 위한 store변수를 사용한다.

const sessionMiddleware = session({ 
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
  store: new RedisStore({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    pass: process.env.REDIS_PASSWORD,
    logErrors: true,
    ttl: 3600,
   }),
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('port', process.env.PORT2 || 8005);

if(process.env.NODE_ENV === 'production'){
  app.use(morgan('combined'));

} else{
  app.use(morgan('dev'));
}
app.use(express.static(path.join(__dirname, 'public')));
app.use('/gif', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
if(process.env.NODE_ENV === 'production'){
  sessionMiddleware.proxy = true;
  sessionMiddleware.cookie.secure = false;
}
app.use(sessionMiddleware);


app.use(flash());
app.use((req, res, next) => {
  if (!req.session.color) {
    const colorHash = new ColorHash();
    req.session.color = colorHash.hex(req.sessionID);
  }
  next();
});

app.use('/', indexRouter);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});





const server = https.createServer(options, app).listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기중');
});

// webSocket(server, app, session(sessionMiddleware));
webSocket(server, app, sessionMiddleware);
