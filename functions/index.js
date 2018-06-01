const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendChatNotification = functions.database.ref('/chats/{roomKey}/{chatKey}')
  .onCreate((snapshot, context) => {
    const roomKey = context.params.roomKey;
    const value = snapshot.val();
    const getChatRoomPromise = admin.database().ref(`/chat_room/${roomKey}`).once('value');

    return getChatRoomPromise.then(result => {
      const chatRoom = result.val();
      return chatRoom;
    }).then((chatRoom) => {
      let senderType;
      let receiverId;

      if (value.senderId === chatRoom.userId) {
        senderType = "users";
        receiverId = chatRoom.trainerId;  
      } else if (value.senderId === chatRoom.trainerId) {
        receiverId = chatRoom.userId;
        senderType = "trainers";
      }

      const getTokenPromise = admin.database().ref(`/fcm_token/${receiverId}`).once('value');
      const getNamePromise = admin.database().ref(`/${senderType}/${value.senderId}`).once('value');
      const extraPropertiesPromise = new Promise((resolve, reject) => {
        resolve({
          senderId: value.senderId,
        });
      });
      return Promise.all([getTokenPromise, getNamePromise, extraPropertiesPromise]);
    }).then((results) => {
      const tokenSnapshot = results[0];
      const nameSnapshot = results[1];
      const extraProperties = results[2];

      const token = tokenSnapshot.val();
      const name = nameSnapshot.val().name;

      const payload = {
        data: {
          title: name,
          body: value.message,
          senderId: extraProperties.senderId,
          roomKey: context.params.roomKey,
        }
      };
      console.log("Created FCM Message");
      console.log(payload);
      return admin.messaging().sendToDevice(token, payload);
    });
  });