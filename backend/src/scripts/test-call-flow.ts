import { io, Socket } from 'socket.io-client';

const URL = 'http://localhost:3000';
const RESTAURANT_ID = 'test-restaurant-1';
const SCREEN_ID = 'test-screen-1';

// Mock Clients
const restaurantSocket: Socket = io(URL);
const screenSocket: Socket = io(URL);

async function runTest() {
  console.log('🧪 Starting Voice Call Flow Test...');

  // 1. Connect Restaurant
  restaurantSocket.on('connect', () => {
    console.log('✅ Restaurant Connected');
    restaurantSocket.emit('join:restaurant', RESTAURANT_ID);
  });

  // 2. Connect Screen
  screenSocket.on('connect', () => {
    console.log('✅ Screen Connected');
    screenSocket.emit('join:screen', SCREEN_ID);
    
    // Start Call Flow after short delay
    setTimeout(initiateCall, 1000);
  });

  // Events
  restaurantSocket.on('call:incoming', (data) => {
    console.log('📨 Restaurant received call:', data);
    
    // Simulate Accept
    setTimeout(() => {
        console.log('📞 Restaurant accepting call...');
        restaurantSocket.emit('call:accept', { callId: data.callId });
    }, 1000);
  });

  screenSocket.on('call:status', (data) => {
      console.log('📱 Screen received status update:', data);
  });

  screenSocket.on('call:accepted', (data) => {
      console.log('✅ Call Accepted by Restaurant:', data);
      
      // Simulate WebRTC Signal
      console.log('📡 Sending WebRTC Offer from Screen...');
      screenSocket.emit('webrtc:signal', {
          targetId: RESTAURANT_ID,
          targetType: 'restaurant',
          type: 'offer',
          payload: { sdp: 'mock-sdp-offer' },
          callId: data.callId
      });
  });

  restaurantSocket.on('webrtc:signal', (data) => {
      console.log('📡 Restaurant received WebRTC Signal:', data);
      
      if (data.type === 'offer') {
          console.log('📡 Sending WebRTC Answer from Restaurant...');
          restaurantSocket.emit('webrtc:signal', {
              targetId: SCREEN_ID,
              targetType: 'screen',
              type: 'answer',
              payload: { sdp: 'mock-sdp-answer' },
              callId: data.callId
          });

          // End call after a few seconds
          setTimeout(() => {
              console.log('🛑 Ending Call...');
              restaurantSocket.emit('call:end', { callId: data.callId });
          }, 2000);
      }
  });

  // End listeners
  restaurantSocket.on('call:ended', () => {
      console.log('🏁 Restaurant: Call Ended');
  });

  screenSocket.on('call:ended', () => {
      console.log('🏁 Screen: Call Ended');
      process.exit(0);
  });
}

function initiateCall() {
    console.log('📞 Screen requesting call...');
    screenSocket.emit('call:request', { restaurantId: RESTAURANT_ID, screenId: SCREEN_ID });
}

runTest().catch(console.error);
