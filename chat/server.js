const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);



let data = '';
const translate_file_path = "C:\\Users\\ChoiChangGyu\\Desktop\\2019-cap1-2019_9\\chat\\mic_test_v2.py"
const spawn = require("child_process").spawn;
const pythonProcess = spawn("python", [translate_file_path]);

str = pythonProcess.stdout.on('data', (data) => {
  data = data.toString();
  console.log(data);
});


http.listen(3000, () => {
  console.log('Connected at 3000');
});