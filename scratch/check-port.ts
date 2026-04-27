import * as net from 'net';

const checkPort = (port: number, host: string) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
};

checkPort(5432, '127.0.0.1').then((isOpen) => {
  console.log(`Port 5432 is ${isOpen ? 'OPEN' : 'CLOSED'}`);
});
