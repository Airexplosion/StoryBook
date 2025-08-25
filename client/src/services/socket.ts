import { io, Socket } from 'socket.io-client';
import { Card } from '../types';

class SocketService {
  private socket: Socket | null = null;

  constructor() {
    // Don't create socket connection immediately
  }

  connect(token: string) {
    if (!this.socket) {
      // 动态检测服务器地址
      const getSocketUrl = () => {
        // 如果设置了环境变量，优先使用
        if (process.env.REACT_APP_SOCKET_URL) {
          return process.env.REACT_APP_SOCKET_URL;
        }
        
        // 动态构建URL：使用当前页面的hostname和协议
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
        const hostname = window.location.hostname;
        // 如果是localhost环境，直接使用localhost和端口
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          const port = '3001'; // 后端默认端口
          return `${protocol}://${hostname}:${port}`;
        }
        
        // 生产环境使用当前域名的IP/域名，不指定端口，因为Nginx会处理端口转发
        return `${protocol}://${hostname}`;
      };

      this.socket = io(getSocketUrl(), {
        auth: { token },
        autoConnect: true
      });
    } else {
      this.socket.auth = { token };
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  joinRoom(roomId: string, userId: string, username: string, spectate?: boolean) {
    if (this.socket) {
      this.socket.emit('join-room', { roomId, userId, username, spectate });
    }
  }

  leaveRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('leave-room', roomId);
    }
  }

  sendGameAction(data: any) {
    if (this.socket) {
      this.socket.emit('game-action', data);
    }
  }

  selectDeck(data: any) {
    if (this.socket) {
      this.socket.emit('select-deck', data);
    }
  }

  onGameStateUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('game-state-update', callback);
    }
  }

  onGameUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('game-update', callback);
    }
  }

  onUserJoined(callback: (userId: string) => void) {
    if (this.socket) {
      this.socket.on('user-joined', callback);
    }
  }

  onUserLeft(callback: (userId: string) => void) {
    if (this.socket) {
      this.socket.on('user-left', callback);
    }
  }

  onGraveyardInfo(callback: (data: { playerName: string; graveyard: Card[] }) => void) {
    if (this.socket) {
      this.socket.on('graveyard-info', callback);
    }
  }

  onRoomPositions(callback: (data: { positions: { [key: string]: any }, canJoinAsPlayer: boolean, playerStates: string[] }) => void) {
    if (this.socket) {
      this.socket.on('room-positions', callback);
    }
  }

  selectPosition(data: { roomId: string, userId: string, username: string, position: string }) {
    if (this.socket) {
      this.socket.emit('select-position', data);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export default new SocketService();
